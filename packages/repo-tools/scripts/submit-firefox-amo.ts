/*
 * Firefox Add-ons release submission.
 *
 * Uploads the Firefox release zip to AMO, waits for validation, then creates a
 * listed version with GitHub's archive of the exact checked-out commit attached.
 * The script exits successfully when AMO credentials are not configured so
 * GitHub releases can still be produced before store automation is enabled.
 */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from '../../../package.json' with { type: 'json' };
import { fetchGitHubSourceArchive } from './lib/github-source-archive.ts';
import { loadLocalEnv } from './lib/local-env.ts';

await loadLocalEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const releaseDir = path.join(root, 'dist', 'release');
const firefoxZipPath = path.join(releaseDir, `youtube-chat-qol-${packageJson.version}-firefox.zip`);
const sourceArchiveName = `youtube-chat-qol-${packageJson.version}-source.zip`;
const apiBaseUrl = process.env.FIREFOX_AMO_API_BASE_URL || 'https://addons.mozilla.org/api/v5';
const apiOrigin = new URL(apiBaseUrl).origin;
const addonId = process.env.FIREFOX_AMO_ADDON_ID || 'chat-enhancer-for-youtube@chat-enhancer-yt.github.io';
const channel = process.env.FIREFOX_AMO_CHANNEL || 'listed';
const requiredEnv = [
  'FIREFOX_AMO_API_KEY',
  'FIREFOX_AMO_API_SECRET'
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.log(`Skipping Firefox Add-ons submission. Missing: ${missingEnv.join(', ')}`);
  process.exit(0);
}

const sourceCommit = readHeadCommit();
const sourceArchive = await fetchGitHubSourceArchive({
  commit: sourceCommit,
  repository: process.env.GITHUB_REPOSITORY || 'chatenhancer/youtube-chat-qol'
});
console.log(`Using GitHub source archive for ${sourceCommit}.`);
const upload = await uploadPackage();
const processedUpload = await waitForValidation(upload);
await createVersion(processedUpload.uuid, sourceArchive);
await updateVersionNotes();

console.log(`Submitted Firefox Add-ons release ${packageJson.version}.`);

async function uploadPackage() {
  const formData = new FormData();
  formData.append('upload', await createFileBlob(firefoxZipPath), path.basename(firefoxZipPath));
  formData.append('channel', channel);

  const response = await amoFetch('/addons/upload/', {
    method: 'POST',
    body: formData
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Firefox upload failed: ${JSON.stringify(payload)}`);
  return payload;
}

async function waitForValidation(upload) {
  const statusPath = upload.url || `/addons/upload/${upload.uuid}/`;

  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await amoFetch(statusPath);
    const payload = await response.json();
    if (!response.ok) throw new Error(`Firefox upload status failed: ${JSON.stringify(payload)}`);

    if (payload.processed) {
      if (!payload.valid) {
        throw new Error(`Firefox upload validation failed: ${JSON.stringify(payload.validation || payload)}`);
      }
      return payload;
    }

    await delay(5000);
  }

  throw new Error('Firefox upload validation did not finish in time.');
}

async function createVersion(uploadUuid, sourceArchive) {
  const formData = new FormData();
  formData.append('upload', uploadUuid);
  formData.append('source', new Blob([Buffer.from(sourceArchive)], {
    type: 'application/zip'
  }), sourceArchiveName);

  if (process.env.FIREFOX_AMO_LICENSE) {
    formData.append('license', process.env.FIREFOX_AMO_LICENSE);
  }

  const response = await amoFetch(`/addons/addon/${encodeURIComponent(addonId)}/versions/`, {
    method: 'POST',
    body: formData
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firefox version creation failed: ${JSON.stringify(payload)}`);
  return payload;
}

async function updateVersionNotes() {
  const releaseNotes = process.env.FIREFOX_AMO_RELEASE_NOTES;
  const approvalNotes = process.env.FIREFOX_AMO_APPROVAL_NOTES;
  if (!releaseNotes && !approvalNotes) return;

  const body: {
    approval_notes?: string;
    release_notes?: Record<string, string>;
  } = {};
  if (releaseNotes) body.release_notes = { 'en-US': releaseNotes };
  if (approvalNotes) body.approval_notes = approvalNotes;

  const response = await amoFetch(
    `/addons/addon/${encodeURIComponent(addonId)}/versions/v${encodeURIComponent(packageJson.version)}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firefox version notes update failed: ${JSON.stringify(payload)}`);
}

async function amoFetch(pathOrUrl, options: any = {}) {
  const url = resolveAmoUrl(pathOrUrl);

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `JWT ${createAmoJwt()}`
    }
  });
}

function createAmoJwt() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  const payload = {
    iss: process.env.FIREFOX_AMO_API_KEY,
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + 60
  };
  const unsignedToken = [
    base64Url(JSON.stringify(header)),
    base64Url(JSON.stringify(payload))
  ].join('.');
  const signature = crypto
    .createHmac('sha256', process.env.FIREFOX_AMO_API_SECRET)
    .update(unsignedToken)
    .digest();

  return `${unsignedToken}.${base64Url(signature)}`;
}

async function createFileBlob(filePath) {
  return new Blob([await readFile(filePath)], {
    type: 'application/zip'
  });
}

function readHeadCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`Could not resolve the source commit: ${result.stderr || 'git rev-parse failed'}`);
  }
  return result.stdout.trim();
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveAmoUrl(pathOrUrl) {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/')) return `${apiOrigin}${pathOrUrl}`;
  return `${apiBaseUrl}${pathOrUrl}`;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

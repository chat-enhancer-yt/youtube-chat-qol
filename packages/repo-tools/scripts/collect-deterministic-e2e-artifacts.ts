/*
 * Collect public-safe end-to-end failure artifacts for CI upload.
 *
 * The full Playwright output can contain live YouTube chat captures. This
 * script reads the JSON report and copies only attachments from failed tests
 * that use extension-owned pages or synthetic YouTube fixtures.
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const SAFE_ARTIFACT_PROJECTS = new Set(['extension-pages', 'youtube-mock']);
const reportPathSetting = process.env.YTCQ_PLAYWRIGHT_JSON_REPORT
  || path.join('test-results', 'e2e', 'playwright-report.json');
const outputDirSetting = process.env.YTCQ_DETERMINISTIC_E2E_ARTIFACTS_DIR
  || path.join('test-results', 'e2e', 'deterministic-artifacts');
const reportPath = resolveRepoPath(reportPathSetting);
const outputDir = resolveRepoPath(outputDirSetting);

await rm(outputDir, { force: true, recursive: true });

if (!existsSync(reportPath)) {
  console.log(
    `No Playwright JSON report found at ${reportPath}; no deterministic artifacts to collect.`
  );
  process.exit(0);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const failedDeterministicTests = getFailedDeterministicTests(report);

if (failedDeterministicTests.length === 0) {
  console.log('No failed deterministic tests found; no artifacts to collect.');
  process.exit(0);
}

const manifest = {
  reportPath: reportPathSetting,
  tests: []
};

let copiedAttachmentCount = 0;

for (const failedTest of failedDeterministicTests) {
  const testDirectory = getSafeFilePart(failedTest.title);
  const copiedAttachments: any[] = [];

  for (const attachment of failedTest.attachments) {
    if (!attachment.path || !existsSync(attachment.path)) continue;

    copiedAttachmentCount += 1;
    const extension = path.extname(attachment.path);
    const fileName = [
      String(copiedAttachmentCount).padStart(3, '0'),
      getSafeFilePart(attachment.name || 'attachment')
    ].filter(Boolean).join('-') + extension;
    const destination = path.join(outputDir, testDirectory, fileName);

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(attachment.path, destination);
    copiedAttachments.push({
      contentType: attachment.contentType,
      name: attachment.name,
      path: path.relative(outputDir, destination)
    });
  }

  manifest.tests.push({
    file: failedTest.file,
    title: failedTest.title,
    attachments: copiedAttachments
  });
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Collected ${copiedAttachmentCount} deterministic end-to-end attachment(s) for ${failedDeterministicTests.length} failed test(s).`
);

function getFailedDeterministicTests(reportJson) {
  const failedTests: any[] = [];

  for (const spec of getSpecs(reportJson.suites || [])) {
    for (const test of spec.tests || []) {
      if (!SAFE_ARTIFACT_PROJECTS.has(test.projectName)) continue;
      if (test.status === 'expected') continue;

      const attachments: any[] = [];
      for (const result of test.results || []) {
        for (const attachment of result.attachments || []) {
          attachments.push(attachment);
        }
      }

      failedTests.push({
        attachments,
        file: spec.file,
        title: spec.title
      });
    }
  }

  return failedTests;
}

function* getSpecs(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs || []) {
      yield spec;
    }
    yield* getSpecs(suite.suites || []);
  }
}

function getSafeFilePart(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 120);
}

function resolveRepoPath(value) {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptPath), '..', '..', '..');
const exactSemverPattern = /^\d+\.\d+\.\d+$/;

export async function validateVersionAlignment(root = defaultRoot) {
  const [packageJson, packageLock, manifest] = await Promise.all([
    readJson(path.join(root, 'package.json')),
    readJson(path.join(root, 'package-lock.json')),
    readJson(path.join(root, 'apps', 'extension', 'manifest.json'))
  ]);
  const versions = [
    ['package.json', packageJson.version],
    ['package-lock.json', packageLock.version],
    ['package-lock.json root package', packageLock.packages?.['']?.version]
  ];

  if (manifest.version !== '0.0.0') {
    throw new Error(
      `apps/extension/manifest.json is a build template and must remain version 0.0.0; received "${manifest.version}".`
    );
  }

  for (const [label, version] of versions) {
    if (!exactSemverPattern.test(String(version || ''))) {
      throw new Error(`${label} must declare an exact X.Y.Z version; received "${version}".`);
    }
  }

  const expectedVersion = packageJson.version;
  const mismatches = versions.filter(([, version]) => version !== expectedVersion);
  if (mismatches.length) {
    const details = versions.map(([label, version]) => `${label}=${version}`).join(', ');
    throw new Error(`Version files are not aligned: ${details}. Update them together; use npm run version:bump for future version changes.`);
  }

  return expectedVersion;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const version = await validateVersionAlignment();
  console.log(`Version files align at ${version}.`);
}

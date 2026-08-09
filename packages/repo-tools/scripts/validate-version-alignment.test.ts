import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateVersionAlignment } from './validate-version-alignment.ts';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('version alignment', () => {
  it('accepts matching exact versions', async () => {
    const root = await writeVersionFixture();

    await expect(validateVersionAlignment(root)).resolves.toBe('1.2.3');
  });

  it('reports every version when tracked metadata drifts', async () => {
    const root = await writeVersionFixture({ packageLockRootVersion: '1.2.2' });

    await expect(validateVersionAlignment(root)).rejects.toThrow(
      'package.json=1.2.3, package-lock.json=1.2.3, package-lock.json root package=1.2.2'
    );
  });

  it('requires the source manifest to remain a template', async () => {
    const root = await writeVersionFixture({ manifestVersion: '1.2.3' });

    await expect(validateVersionAlignment(root)).rejects.toThrow(
      'apps/extension/manifest.json is a build template and must remain version 0.0.0'
    );
  });

  it('rejects non-release versions', async () => {
    const root = await writeVersionFixture({ packageLockVersion: '1.2' });

    await expect(validateVersionAlignment(root)).rejects.toThrow(
      'package-lock.json must declare an exact X.Y.Z version'
    );
  });
});

async function writeVersionFixture({
  packageVersion = '1.2.3',
  packageLockVersion = packageVersion,
  packageLockRootVersion = packageVersion,
  manifestVersion = '0.0.0'
}: {
  packageVersion?: string;
  packageLockVersion?: string;
  packageLockRootVersion?: string;
  manifestVersion?: string;
} = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'ytcq-version-alignment-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'apps', 'extension'), { recursive: true });
  await Promise.all([
    writeJson(path.join(root, 'package.json'), { version: packageVersion }),
    writeJson(path.join(root, 'package-lock.json'), {
      version: packageLockVersion,
      packages: { '': { version: packageLockRootVersion } }
    }),
    writeJson(path.join(root, 'apps', 'extension', 'manifest.json'), { version: manifestVersion })
  ]);
  return root;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

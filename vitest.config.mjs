import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const unitProjectRoots = discoverUnitProjectRoots();

export default defineConfig({
  test: {
    coverage: {
      include: unitProjectRoots.flatMap(getProjectCoverageIncludes),
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage/unit'
    },
    projects: unitProjectRoots.map((projectRoot) => `${projectRoot}/vitest.unit.config.ts`)
  }
});

function discoverUnitProjectRoots() {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  return [...new Set((packageJson.workspaces ?? []).flatMap(expandWorkspacePattern))]
    .filter(hasUnitProjectConfig)
    .sort();
}

function expandWorkspacePattern(pattern) {
  const normalizedPattern = toPosixPath(pattern).replace(/\/$/, '');
  if (!normalizedPattern.endsWith('/*')) return [normalizedPattern];

  const container = normalizedPattern.slice(0, -2);
  const containerPath = path.join(repoRoot, container);
  if (!existsSync(containerPath)) return [];

  return readdirSync(containerPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${container}/${entry.name}`);
}

function hasUnitProjectConfig(projectRoot) {
  return existsSync(path.join(repoRoot, projectRoot, 'vitest.unit.config.ts'));
}

function getProjectCoverageIncludes(projectRoot) {
  const sourceRoot = `${projectRoot}/src`;
  if (!existsSync(path.join(repoRoot, sourceRoot))) return [];
  return [`${sourceRoot}/**/*.ts`, `${sourceRoot}/**/*.tsx`];
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

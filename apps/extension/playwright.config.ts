/**
 * Playwright end-to-end test configuration.
 *
 * These tests launch the built Chrome extension in a persistent Chromium
 * profile so content scripts, extension storage, and the popup can be tested
 * together instead of only through isolated unit tests.
 */
import { defineConfig } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldCaptureE2eFailureArtifacts } from './e2e/support/artifact-policy';

const extensionRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(extensionRoot, '..', '..');
const DEFAULT_WORKERS = getE2eSpecFileCount();
const reportOutputFolder = resolveRepoPath(
  process.env.YTCQ_PLAYWRIGHT_REPORT_DIR ?? 'playwright-report/e2e'
);
const jsonReportPath = process.env.YTCQ_PLAYWRIGHT_JSON_REPORT
  ? resolveRepoPath(process.env.YTCQ_PLAYWRIGHT_JSON_REPORT)
  : undefined;
const failureArtifactUse = {
  screenshot: 'only-on-failure' as const,
  trace: 'retain-on-failure' as const,
  video: 'retain-on-failure' as const
};
const disabledArtifactUse = {
  screenshot: 'off' as const,
  trace: 'off' as const,
  video: 'off' as const
};

export default defineConfig({
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  outputDir: path.join(repoRoot, 'test-results', 'e2e'),
  projects: [
    {
      name: 'extension-pages',
      testMatch: /specs\/extension-pages\/.*\.spec\.ts/,
      use: failureArtifactUse
    },
    {
      name: 'youtube-mock',
      testMatch: /specs\/youtube\/mock\/.*\.spec\.ts/,
      use: failureArtifactUse
    },
    {
      name: 'youtube-real-logged-out',
      testMatch: /specs\/youtube\/real\/.*\/logged-out\/.*\.spec\.ts/,
      use: shouldCaptureE2eFailureArtifacts('youtube-real-logged-out')
        ? failureArtifactUse
        : disabledArtifactUse
    },
    {
      name: 'youtube-native-transport-logged-out',
      testMatch: /specs\/youtube\/native-transport\/.*\/logged-out\/.*\.spec\.ts/,
      use: shouldCaptureE2eFailureArtifacts('youtube-native-transport-logged-out')
        ? failureArtifactUse
        : disabledArtifactUse
    },
    {
      name: 'youtube-native-transport-logged-in',
      testMatch: /specs\/youtube\/native-transport\/.*\/logged-in\/.*\.spec\.ts/,
      use: shouldCaptureE2eFailureArtifacts('youtube-native-transport-logged-in')
        ? failureArtifactUse
        : disabledArtifactUse
    },
    {
      name: 'youtube-real-logged-in',
      testMatch: /specs\/youtube\/real\/.*\/logged-in\/.*\.spec\.ts/,
      use: shouldCaptureE2eFailureArtifacts('youtube-real-logged-in')
        ? failureArtifactUse
        : disabledArtifactUse
    },
    {
      name: 'integrations',
      testMatch: /specs\/integrations\/.*\.spec\.ts/,
      use: failureArtifactUse
    }
  ],
  reporter: getReporters(),
  testDir: path.join(extensionRoot, 'e2e'),
  timeout: 90_000,
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  workers: getWorkerCount()
});

function getReporters() {
  const reporters: NonNullable<Parameters<typeof defineConfig>[0]['reporter']> = [
    ['list'],
    ['html', { open: 'never', outputFolder: reportOutputFolder }]
  ];
  if (jsonReportPath) {
    reporters.push(['json', { outputFile: jsonReportPath }]);
  }
  return reporters;
}

function getWorkerCount(): number {
  const rawWorkerCount = process.env.YTCQ_TEST_WORKERS;
  if (!rawWorkerCount) return DEFAULT_WORKERS;

  const workerCount = Number.parseInt(rawWorkerCount, 10);
  if (!Number.isFinite(workerCount) || workerCount < 1) return DEFAULT_WORKERS;

  return workerCount;
}

function getE2eSpecFileCount(): number {
  const specsDir = path.join(extensionRoot, 'e2e', 'specs');
  try {
    return Math.max(1, countSpecFiles(specsDir));
  } catch {
    return 1;
  }
}

function resolveRepoPath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function countSpecFiles(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce((count, entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return count + countSpecFiles(entryPath);
    return count + (entry.name.endsWith('.spec.ts') ? 1 : 0);
  }, 0);
}

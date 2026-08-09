/**
 * Playwright performance-test configuration.
 *
 * Performance checks are intentionally separate from the normal end-to-end
 * suite. Incoming-chat benchmarks run against YouTube's native client with a
 * locally controlled continuation transport; composer-only work keeps the
 * deterministic fixture. Both report timing, heap, and long-task metrics.
 */
import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldCaptureE2eFailureArtifacts } from './e2e/support/artifact-policy';

const extensionRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(extensionRoot, '..', '..');
const reportOutputFolder = resolveRepoPath(
  process.env.YTCQ_PLAYWRIGHT_REPORT_DIR ?? 'playwright-report/performance'
);
const jsonReportPath = resolveRepoPath(
  process.env.YTCQ_PLAYWRIGHT_JSON_REPORT ?? 'test-results/performance/playwright-report.json'
);

export default defineConfig({
  expect: {
    timeout: 20_000
  },
  fullyParallel: false,
  outputDir: path.join(repoRoot, 'test-results', 'performance', 'e2e'),
  projects: [
    createPerformanceProject('youtube-mock-perf', /mock\/.*\.spec\.ts/),
    createPerformanceProject(
      'youtube-live-performance',
      /native-transport\/.*\.spec\.ts/
    )
  ],
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: reportOutputFolder }],
    ['json', { outputFile: jsonReportPath }]
  ],
  testDir: path.join(extensionRoot, 'e2e', 'performance'),
  timeout: 120_000,
  use: {
    actionTimeout: 20_000,
    navigationTimeout: 30_000
  },
  workers: 1
});

function resolveRepoPath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function createPerformanceProject(name: string, testMatch: RegExp) {
  const captureFailureArtifacts = shouldCaptureE2eFailureArtifacts(name);
  return {
    name,
    testMatch,
    use: {
      screenshot: captureFailureArtifacts ? 'only-on-failure' as const : 'off' as const,
      trace: captureFailureArtifacts ? 'retain-on-failure' as const : 'off' as const,
      video: 'off' as const
    }
  };
}

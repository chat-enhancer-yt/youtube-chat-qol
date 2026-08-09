/*
 * End-to-end test runner.
 *
 * Public npm end-to-end commands should build the Chrome extension first.
 * The repo verification command already builds every extension target, so it
 * calls this runner with --no-build to avoid rebuilding before Playwright.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createE2eTestPlan } from './run-e2e-tests-plan.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const { playwrightArgs, reportOutputFolder, shouldBuild } = createE2eTestPlan(args);
const jsonReportPath = process.env.YTCQ_PLAYWRIGHT_JSON_REPORT
  || (process.env.GITHUB_STEP_SUMMARY ? 'test-results/e2e/playwright-report.json' : '');

if (shouldBuild) {
  run(getNpmCommand(), ['run', 'build:chrome']);
}

run(getPlaywrightCommand(), playwrightArgs, {
  YTCQ_PLAYWRIGHT_REPORT_DIR: reportOutputFolder,
  ...(jsonReportPath ? { YTCQ_PLAYWRIGHT_JSON_REPORT: jsonReportPath } : {})
});

function run(command, commandArgs, extraEnv: Record<string, string> = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} exited with ${result.status ?? 'unknown status'}`);
  }
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function getPlaywrightCommand() {
  return process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
}

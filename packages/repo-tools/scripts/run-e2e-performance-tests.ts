/*
 * End-to-end performance-test runner.
 *
 * Performance tests use a separate Playwright config so they can generate
 * timing reports without joining the normal end-to-end suite.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const shouldBuild = !args.includes('--no-build');
const playwrightArgs = [
  'test',
  '--config=apps/extension/playwright.perf.config.ts',
  ...args.filter((arg) => arg !== '--no-build')
];

if (shouldBuild) {
  run(getNpmCommand(), ['run', 'build:chrome']);
}

run(getPlaywrightCommand(), playwrightArgs, {
  YTCQ_PLAYWRIGHT_JSON_REPORT: process.env.YTCQ_PLAYWRIGHT_JSON_REPORT || 'test-results/performance/playwright-report.json',
  YTCQ_PLAYWRIGHT_REPORT_DIR: process.env.YTCQ_PLAYWRIGHT_REPORT_DIR || 'playwright-report/performance'
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

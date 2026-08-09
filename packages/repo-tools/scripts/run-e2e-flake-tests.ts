/*
 * End-to-end flake-test runner.
 *
 * Runs the normal end-to-end suite repeatedly so a suspected flaky fix can be
 * checked. Extra arguments are forwarded to the repo-tools `e2e:test` implementation.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_RUNS = 10;
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..', '..', '..');
const e2eTestRunner = path.join(scriptsDir, 'run-e2e-tests.ts');

const { e2eArgs, runs } = parseArgs(process.argv.slice(2));
const timings: any[] = [];

for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
  console.log(`\n=== end-to-end suite run ${runIndex}/${runs} ===\n`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [
    e2eTestRunner,
    ...e2eArgs
  ], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit'
  });
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  timings.push(elapsedSeconds);

  if (result.status !== 0) {
    console.error(`\nEnd-to-end flake run ${runIndex}/${runs} failed after ${formatSeconds(elapsedSeconds)}.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nEnd-to-end flake run passed ${runs}/${runs} runs.`);
console.log(`Run times: ${timings.map(formatSeconds).join(', ')}`);

function parseArgs(args) {
  const e2eArgs: any[] = [];
  let runs = getEnvRuns();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--runs') {
      runs = parseRuns(args[index + 1], '--runs');
      index += 1;
    } else if (arg.startsWith('--runs=')) {
      runs = parseRuns(arg.slice('--runs='.length), '--runs');
    } else {
      e2eArgs.push(arg);
    }
  }

  return { e2eArgs, runs };
}

function getEnvRuns() {
  return process.env.YTCQ_E2E_FLAKE_RUNS
    ? parseRuns(process.env.YTCQ_E2E_FLAKE_RUNS, 'YTCQ_E2E_FLAKE_RUNS')
    : DEFAULT_RUNS;
}

function parseRuns(value, source) {
  const runs = Number(value);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(`${source} must be a positive integer.`);
  }
  return runs;
}

function formatSeconds(seconds) {
  return `${seconds.toFixed(1)}s`;
}

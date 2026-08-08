/*
 * Cloudflare test runner.
 *
 * Python tests live beside container code in non-package directories, where
 * unittest cannot discover them from the Cloudflare root. Find those files
 * recursively, then run them alongside the TypeScript suite.
 */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const cloudflareRoot = path.join(repoRoot, 'cloudflare');
const pythonOnly = process.argv.slice(2).includes('--python-only');
const pythonTests = await findPythonTests(cloudflareRoot);

if (pythonTests.length === 0) {
  console.error('No Python tests found under cloudflare.');
  process.exit(1);
}

const testCommands = pythonTests.map((testPath) => ({
  label: path.relative(repoRoot, testPath),
  command: process.platform === 'win32' ? 'python' : 'python3',
  args: [
    '-B',
    '-m',
    'unittest',
    'discover',
    '-s',
    path.dirname(testPath),
    '-p',
    path.basename(testPath)
  ]
}));

if (!pythonOnly) {
  testCommands.unshift({
    label: 'Cloudflare TypeScript tests',
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'cloudflare:test:ts']
  });
}

const exitCodes = await Promise.all(testCommands.map(runTestCommand));
process.exit(exitCodes.every((exitCode) => exitCode === 0) ? 0 : 1);

async function findPythonTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPythonTests(entryPath);
    if (entry.isFile() && isPythonTestName(entry.name)) return [entryPath];
    return [];
  }));

  return matches.flat().sort();
}

function isPythonTestName(fileName) {
  return fileName.endsWith('_test.py') || (
    fileName.startsWith('test_') && fileName.endsWith('.py')
  );
}

function runTestCommand({ label, command, args }) {
  console.log(`Starting ${label}`);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit'
    });

    child.once('error', (error) => {
      console.error(`${label} could not start: ${error.message}`);
      resolve(1);
    });
    child.once('close', (exitCode) => resolve(exitCode ?? 1));
  });
}

/*
 * Cloudflare test runner.
 *
 * Worker projects opt in by living under apps/ with a wrangler.toml and a test
 * script. Python tests are discovered recursively beside their container code,
 * then everything runs in parallel.
 */
import { spawn } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const appsRoot = path.join(repoRoot, 'apps');
const IGNORED_DISCOVERY_DIRECTORIES = new Set(['.wrangler', 'dist', 'node_modules']);
const pythonOnly = process.argv.slice(2).includes('--python-only');
const typescriptOnly = process.argv.slice(2).includes('--typescript-only');

if (pythonOnly && typescriptOnly) {
  console.error('Choose either --python-only or --typescript-only.');
  process.exit(1);
}

const workerProjects = await findWorkerProjects(appsRoot);
if (workerProjects.length === 0) {
  console.error('No testable Worker projects found under apps/.');
  process.exit(1);
}

const pythonTests = typescriptOnly
  ? []
  : (await Promise.all(workerProjects.map((project) => findPythonTests(project.root)))).flat();

if (!typescriptOnly && pythonTests.length === 0) {
  console.error('No Python tests found under Worker projects.');
  process.exit(1);
}

const testCommands = typescriptOnly ? [] : pythonTests.map((testPath) => ({
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
  testCommands.unshift(...workerProjects.map((project) => createWorkspaceTestCommand(project.name)));
}

const exitCodes = await Promise.all(testCommands.map(runTestCommand));
process.exit(exitCodes.every((exitCode) => exitCode === 0) ? 0 : 1);

async function findPythonTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && !IGNORED_DISCOVERY_DIRECTORIES.has(entry.name)) {
      return findPythonTests(entryPath);
    }
    if (entry.isFile() && isPythonTestName(entry.name)) return [entryPath];
    return [];
  }));

  return matches.flat().sort();
}

async function findWorkerProjects(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name))
    .sort();

  const projects = await Promise.all(candidates.map(readWorkerProject));
  return projects.filter(Boolean);
}

async function readWorkerProject(projectRoot) {
  if (!await fileExists(path.join(projectRoot, 'wrangler.toml'))) return null;

  const packagePath = path.join(projectRoot, 'package.json');
  if (!await fileExists(packagePath)) {
    throw new Error(`Worker project ${path.relative(repoRoot, projectRoot)} has no package.json.`);
  }

  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  if (!packageJson.name || typeof packageJson.scripts?.test !== 'string') {
    throw new Error(
      `Worker project ${path.relative(repoRoot, projectRoot)} must declare a package name and test script.`
    );
  }

  return { name: packageJson.name, root: projectRoot };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isPythonTestName(fileName) {
  return fileName.endsWith('_test.py') || (
    fileName.startsWith('test_') && fileName.endsWith('.py')
  );
}

function createWorkspaceTestCommand(workspace) {
  return {
    label: `${workspace} TypeScript tests`,
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'test', '-w', workspace]
  };
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

/*
 * Bounded repository check runner.
 *
 * Workspaces declare their leaf checks in package.json under repoTools.checks.
 * This runner flattens the selected workspaces into one process pool so CI can
 * parallelize independent tools without nesting unbounded npm invocations.
 */
import { spawn } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const DEFAULT_CONCURRENCY = 2;

type PackageJson = {
  name?: string;
  repoTools?: {
    checks?: unknown;
  };
  scripts?: Record<string, string>;
  workspaces?: unknown;
};

export type CheckPackage = {
  isRoot: boolean;
  name: string;
  packageJson: PackageJson;
};

export type CheckTask = {
  isRoot: boolean;
  script: string;
  workspace: string;
};

export type CheckArguments = {
  all: boolean;
  concurrency: number;
  workspaces: string[];
};

type CheckResult = {
  exitCode: number;
  task: CheckTask;
};

if (isEntrypoint()) {
  try {
    await main();
  } catch (error) {
    console.error(`[checks] ${formatError(error)}`);
    process.exitCode = 1;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    printUsage();
    return;
  }

  const options = parseCheckArguments(args);
  const packages = await discoverPackages(repoRoot);
  const tasks = createCheckTasks(packages, options);
  console.log(
    `[checks] Running ${tasks.length} check${tasks.length === 1 ? '' : 's'} ` +
      `with at most ${options.concurrency} concurrent task${options.concurrency === 1 ? '' : 's'}.`
  );

  const results = await runTaskPool(tasks, options.concurrency, runCheckTask);
  const failures = results.filter(({ exitCode }) => exitCode !== 0);
  if (failures.length === 0) {
    console.log(`[checks] All ${tasks.length} checks passed.`);
    return;
  }

  console.error(
    `[checks] ${failures.length} check${failures.length === 1 ? '' : 's'} failed: ` +
      failures.map(({ task }) => formatTask(task)).join(', ')
  );
  process.exitCode = 1;
}

export function parseCheckArguments(args: string[]): CheckArguments {
  let all = false;
  let concurrency = DEFAULT_CONCURRENCY;
  const workspaces: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--all') {
      all = true;
      continue;
    }
    if (arg === '--concurrency') {
      const value = args[index + 1];
      if (!value) throw new Error('--concurrency requires a positive integer.');
      concurrency = parseConcurrency(value);
      index += 1;
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      concurrency = parseConcurrency(arg.slice('--concurrency='.length));
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    if (!workspaces.includes(arg)) workspaces.push(arg);
  }

  if (all && workspaces.length > 0) {
    throw new Error('Choose either --all or explicit workspace names.');
  }
  if (!all && workspaces.length === 0) {
    throw new Error('Pass --all or at least one workspace name.');
  }

  return { all, concurrency, workspaces };
}

export function createCheckTasks(
  packages: CheckPackage[],
  { all, workspaces }: Pick<CheckArguments, 'all' | 'workspaces'>
): CheckTask[] {
  const packagesByName = new Map(packages.map((workspace) => [workspace.name, workspace]));
  const selectedPackages = all
    ? packages.filter((workspace) => workspace.packageJson.repoTools !== undefined)
    : workspaces.map((name) => {
        const workspace = packagesByName.get(name);
        if (!workspace) throw new Error(`Unknown workspace: ${name}`);
        return workspace;
      });

  const tasks = selectedPackages.flatMap((workspace) => {
    const checks = getChecks(workspace);
    return checks.map((script) => ({
      isRoot: workspace.isRoot,
      script,
      workspace: workspace.name
    }));
  });

  if (tasks.length === 0) throw new Error('No checks were selected.');
  return tasks;
}

export async function runTaskPool<TTask, TResult>(
  tasks: TTask[],
  concurrency: number,
  runTask: (task: TTask) => Promise<TResult>
): Promise<TResult[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Task concurrency must be a positive integer.');
  }
  if (tasks.length === 0) return [];

  const results = new Array<TResult>(tasks.length);
  let nextTaskIndex = 0;
  const workerCount = Math.min(concurrency, tasks.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextTaskIndex < tasks.length) {
        const taskIndex = nextTaskIndex;
        nextTaskIndex += 1;
        results[taskIndex] = await runTask(tasks[taskIndex]);
      }
    })
  );

  return results;
}

async function discoverPackages(root: string): Promise<CheckPackage[]> {
  const rootPackage = await readPackage(root, true);
  const workspacePatterns = rootPackage.packageJson.workspaces;
  if (
    !Array.isArray(workspacePatterns) ||
    !workspacePatterns.every((entry) => typeof entry === 'string')
  ) {
    throw new Error('The root package.json must declare a string workspaces array.');
  }

  const workspaceRoots = new Set<string>();
  for (const pattern of workspacePatterns) {
    for (const workspaceRoot of await expandWorkspacePattern(root, pattern)) {
      workspaceRoots.add(workspaceRoot);
    }
  }

  const workspaces = await Promise.all(
    [...workspaceRoots].sort().map((workspaceRoot) => readPackage(workspaceRoot, false))
  );
  const packages = [rootPackage, ...workspaces];
  const duplicateNames = packages
    .map(({ name }) => name)
    .filter((name, index, names) => names.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    throw new Error(`Duplicate workspace name: ${duplicateNames[0]}`);
  }

  return packages;
}

async function expandWorkspacePattern(root: string, pattern: string): Promise<string[]> {
  if (!pattern.includes('*')) return [path.resolve(root, pattern)];
  if (!pattern.endsWith('/*') || pattern.slice(0, -2).includes('*')) {
    throw new Error(`Unsupported workspace pattern: ${pattern}`);
  }

  const parent = path.resolve(root, pattern.slice(0, -2));
  const entries = await readdir(parent, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name))
    .sort();
  const packageRoots: string[] = [];
  for (const candidate of candidates) {
    if (await fileExists(path.join(candidate, 'package.json'))) packageRoots.push(candidate);
  }
  return packageRoots;
}

async function readPackage(packageRoot: string, isRoot: boolean): Promise<CheckPackage> {
  const packagePath = path.join(packageRoot, 'package.json');
  let packageJson: PackageJson;
  try {
    packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not read ${path.relative(repoRoot, packagePath)}: ${formatError(error)}`
    );
  }
  if (!packageJson.name) {
    throw new Error(`${path.relative(repoRoot, packagePath)} must declare a package name.`);
  }
  return { isRoot, name: packageJson.name, packageJson };
}

function getChecks(workspace: CheckPackage): string[] {
  const checks = workspace.packageJson.repoTools?.checks;
  if (!Array.isArray(checks) || checks.length === 0 || !checks.every(isNonEmptyString)) {
    throw new Error(`${workspace.name} must declare a non-empty repoTools.checks array.`);
  }

  for (const script of checks) {
    if (script === 'check') {
      throw new Error(`${workspace.name} repoTools.checks must contain leaf scripts, not check.`);
    }
    if (typeof workspace.packageJson.scripts?.[script] !== 'string') {
      throw new Error(`${workspace.name} does not declare the ${script} script.`);
    }
  }
  return checks;
}

function runCheckTask(task: CheckTask): Promise<CheckResult> {
  const label = formatTask(task);
  const startTime = performance.now();
  const args = task.isRoot ? ['run', task.script] : ['run', task.script, '-w', task.workspace];
  console.log(`[checks] Starting ${label}.`);

  return new Promise((resolve) => {
    const child = spawn(getNpmCommand(), args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit'
    });
    let settled = false;
    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      const duration = ((performance.now() - startTime) / 1_000).toFixed(1);
      const status = exitCode === 0 ? 'Passed' : 'Failed';
      console.log(`[checks] ${status} ${label} in ${duration}s.`);
      resolve({ exitCode, task });
    };

    child.once('error', (error) => {
      console.error(`[checks] Could not start ${label}: ${error.message}`);
      finish(1);
    });
    child.once('close', (exitCode) => finish(exitCode ?? 1));
  });
}

function parseConcurrency(value: string): number {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency requires a positive integer.');
  }
  return concurrency;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatTask({ workspace, script }: CheckTask): string {
  return `${workspace}:${script}`;
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isEntrypoint() {
  return Boolean(
    process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  );
}

function printUsage() {
  console.log(`Usage:
  npm run checks -w @chatenhancer/repo-tools -- --all [--concurrency=2]
  npm run checks -w @chatenhancer/repo-tools -- [--concurrency=2] <workspace>...`);
}

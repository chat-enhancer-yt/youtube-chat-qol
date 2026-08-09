import { describe, expect, it } from 'vitest';
import {
  createCheckTasks,
  parseCheckArguments,
  runTaskPool,
  type CheckPackage
} from './run-checks.ts';

describe('bounded repository check runner', () => {
  it('parses explicit workspaces and a concurrency cap', () => {
    expect(
      parseCheckArguments([
        '--concurrency=3',
        '@chatenhancer/extension',
        '@chatenhancer/repo-tools'
      ])
    ).toEqual({
      all: false,
      concurrency: 3,
      workspaces: ['@chatenhancer/extension', '@chatenhancer/repo-tools']
    });
  });

  it('requires either all workspaces or an explicit selection', () => {
    expect(() => parseCheckArguments([])).toThrow('Pass --all or at least one workspace name.');
    expect(() => parseCheckArguments(['--all', '@chatenhancer/extension'])).toThrow(
      'Choose either --all or explicit workspace names.'
    );
  });

  it('rejects invalid concurrency values', () => {
    expect(() => parseCheckArguments(['--all', '--concurrency=0'])).toThrow(
      '--concurrency requires a positive integer.'
    );
  });

  it('creates leaf tasks from package-owned check declarations', () => {
    const packages = [
      createPackage('@chatenhancer/extension', ['typecheck', 'lint']),
      createPackage('@chatenhancer/repo-tools', ['typecheck', 'lint'])
    ];

    expect(
      createCheckTasks(packages, {
        all: false,
        workspaces: ['@chatenhancer/extension']
      })
    ).toEqual([
      {
        isRoot: false,
        script: 'typecheck',
        workspace: '@chatenhancer/extension'
      },
      {
        isRoot: false,
        script: 'lint',
        workspace: '@chatenhancer/extension'
      }
    ]);
  });

  it('rejects recursive or missing leaf scripts', () => {
    expect(() =>
      createCheckTasks([createPackage('@chatenhancer/extension', ['check'])], {
        all: true,
        workspaces: []
      })
    ).toThrow('must contain leaf scripts');
    const missingScriptPackage = createPackage('@chatenhancer/extension', ['missing']);
    missingScriptPackage.packageJson.scripts = {};
    expect(() => createCheckTasks([missingScriptPackage], { all: true, workspaces: [] })).toThrow(
      'does not declare the missing script'
    );
  });

  it('never exceeds the requested task concurrency', async () => {
    let activeTasks = 0;
    let maximumActiveTasks = 0;
    const results = await runTaskPool([1, 2, 3, 4], 2, async (value) => {
      activeTasks += 1;
      maximumActiveTasks = Math.max(maximumActiveTasks, activeTasks);
      await new Promise((resolve) => setTimeout(resolve, 2));
      activeTasks -= 1;
      return value * 2;
    });

    expect(maximumActiveTasks).toBe(2);
    expect(results).toEqual([2, 4, 6, 8]);
  });
});

function createPackage(name: string, checks: string[]): CheckPackage {
  return {
    isRoot: false,
    name,
    packageJson: {
      repoTools: { checks },
      scripts: Object.fromEntries(checks.map((script) => [script, 'example']))
    }
  };
}

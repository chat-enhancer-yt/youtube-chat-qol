import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..', '..', '..');
const packageJsonPath = path.join(root, 'package.json');

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main();
}

async function main() {
  const args = parseReleaseTagArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const version = String(packageJson.version || '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Expected package.json version to be exact semver X.Y.Z, got "${packageJson.version}".`);
  }

  const tagName = `v${version}`;
  const tagRef = `refs/tags/${tagName}`;
  const branch = gitOutput(['branch', '--show-current']);
  if (!branch) {
    throw new Error('Cannot create a release tag while Git is detached from a branch.');
  }

  const dirtyFiles = gitOutput(['status', '--porcelain']);
  if (dirtyFiles) {
    throw new Error([
      `Refusing to ${args.retry ? 'retry' : 'create'} a release tag with uncommitted changes.`,
      'Commit the release changes first, then run this command again.'
    ].join('\n'));
  }

  const localTagOid = getLocalTagOid(tagRef);
  const remoteTag = getRemoteTag(args.remote, tagRef);
  const headOid = gitOutput(['rev-parse', 'HEAD']);

  if (args.retry) {
    validateRetry(tagName, remoteTag, headOid);
  } else {
    validateNewTag(tagName, args.remote, localTagOid, remoteTag);
  }

  const releasePreview = getReleasePreview(tagName);
  if (args.retry) {
    printRetryPreview(tagName, remoteTag, headOid);
  }
  printReleasePreview(tagName, releasePreview);

  if (args.dryRun) {
    console.log(`Would push ${branch} to ${args.remote}.`);
    if (args.retry) {
      console.log(`Would replace annotated tag ${tagName} on ${args.remote} with a tag at ${shortOid(headOid)}.`);
      console.log('Would trigger a new release workflow for the replacement tag.');
    } else {
      console.log(`Would create annotated tag ${tagName}.`);
      console.log(`Would push ${tagName} to ${args.remote}.`);
    }
    return;
  }

  const confirmed = args.retry
    ? await confirmRetry(tagName)
    : await confirmRelease(tagName);
  if (!confirmed) {
    console.log(`Aborted ${tagName}.`);
    return;
  }

  git(['push', args.remote, `HEAD:${branch}`]);

  if (args.retry) {
    replaceReleaseTag(tagName, args.remote, remoteTag, localTagOid);
    console.log(`Moved and pushed ${tagName} to ${shortOid(headOid)}. A new release workflow should start.`);
    return;
  }

  git(['tag', '-a', tagName, '-m', `Release ${tagName}`]);
  git(['push', args.remote, tagName]);

  console.log(`Created and pushed ${tagName}.`);
}

export function parseReleaseTagArgs(argv: string[]) {
  const parsed = {
    dryRun: false,
    help: false,
    remote: 'origin',
    retry: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--retry') {
      parsed.retry = true;
      continue;
    }
    if (arg === '--remote') {
      const remote = argv[index + 1];
      if (!remote) {
        throw new Error('Expected a remote name after --remote.');
      }
      parsed.remote = remote;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

export function parseRemoteTagOutput(output: string, tagRef: string) {
  let refOid = '';
  let peeledOid = '';

  for (const line of output.split('\n')) {
    const [oid = '', ref = ''] = line.trim().split(/\s+/);
    if (ref === tagRef) refOid = oid;
    if (ref === `${tagRef}^{}`) peeledOid = oid;
  }

  if (!refOid) return null;

  return {
    refOid,
    targetOid: peeledOid || refOid
  };
}

function validateNewTag(tagName, remote, localTagOid, remoteTag) {
  if (localTagOid) {
    throw new Error([
      `Tag ${tagName} already exists locally.`,
      `If the previous release failed before publication, run npm run release:retry instead.`
    ].join('\n'));
  }
  if (remoteTag) {
    throw new Error([
      `Tag ${tagName} already exists on ${remote}.`,
      `If the previous release failed before publication, run npm run release:retry instead.`
    ].join('\n'));
  }
}

function validateRetry(tagName, remoteTag, headOid) {
  if (!remoteTag) {
    throw new Error([
      `Cannot retry ${tagName} because it does not exist on the remote.`,
      'Create it with npm run release:tag instead.'
    ].join('\n'));
  }

  if (remoteTag.targetOid === headOid) {
    throw new Error([
      `${tagName} already points to the current commit ${shortOid(headOid)}.`,
      'There is no newer fix to release. Re-run the failed workflow from GitHub Actions instead.'
    ].join('\n'));
  }

  const targetExists = spawnGit(['cat-file', '-e', `${remoteTag.targetOid}^{commit}`]);
  if (targetExists.status !== 0) {
    throw new Error([
      `The current ${tagName} target is not available in this clone.`,
      'Fetch the remote tags and try again.'
    ].join('\n'));
  }

  const isForwardMove = spawnGit(['merge-base', '--is-ancestor', remoteTag.targetOid, 'HEAD']);
  if (isForwardMove.status === 1) {
    throw new Error([
      `Refusing to move ${tagName} to an unrelated or older commit.`,
      'A release retry must move the tag forward from its existing target.'
    ].join('\n'));
  }
  if (isForwardMove.status !== 0) {
    throwGitError(['merge-base', '--is-ancestor', remoteTag.targetOid, 'HEAD'], isForwardMove);
  }
}

function replaceReleaseTag(tagName, remote, remoteTag, previousLocalOid) {
  const tagRef = `refs/tags/${tagName}`;
  git(['tag', '-f', '-a', tagName, '-m', `Release ${tagName}`]);

  try {
    git([
      'push',
      `--force-with-lease=${tagRef}:${remoteTag.refOid}`,
      remote,
      `${tagRef}:${tagRef}`
    ]);
  } catch (error) {
    const rollbackArgs = previousLocalOid
      ? ['update-ref', tagRef, previousLocalOid]
      : ['update-ref', '-d', tagRef];
    const rollback = spawnGit(rollbackArgs);
    if (rollback.status !== 0) {
      throw new Error(`${String(error)}\nThe remote tag was preserved, but restoring the local tag also failed.`);
    }
    throw error;
  }
}

function getLocalTagOid(tagRef) {
  const result = spawnGit(['rev-parse', '--verify', '--quiet', tagRef]);
  if (result.status === 0) return result.stdout.trim();
  if (result.status === 1) return '';
  throwGitError(['rev-parse', '--verify', '--quiet', tagRef], result);
}

function getRemoteTag(remote, tagRef) {
  const gitArgs = ['ls-remote', '--tags', remote, tagRef, `${tagRef}^{}`];
  const result = spawnGit(gitArgs);
  if (result.status !== 0) throwGitError(gitArgs, result);
  return parseRemoteTagOutput(result.stdout, tagRef);
}

function printUsage() {
  console.log([
    'Usage:',
    '  npm run release:tag -- [--remote <name>] [--dry-run]',
    '  npm run release:retry -- [--remote <name>] [--dry-run]',
    '',
    'release:tag pushes the current branch, creates the version tag from',
    'package.json, and pushes it to start the release workflow.',
    '',
    'release:retry is for a failed, unpublished release after its fix has been',
    'committed. It moves the existing version tag forward to HEAD with a guarded',
    'force-push, which starts a new release workflow for the same version.',
    '',
    'Both commands require a clean worktree and show the release commits before',
    'asking for confirmation.'
  ].join('\n'));
}

function getReleasePreview(tagName) {
  const previousTag = getPreviousReleaseTag(tagName);
  const logRange = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const commitOutput = gitOutput(['log', '--pretty=format:%h %s', '--reverse', logRange]);
  const commits = commitOutput ? commitOutput.split('\n') : [];

  return {
    commits,
    logRange,
    previousTag
  };
}

function getPreviousReleaseTag(tagName) {
  const tagOutput = gitOutput(['tag', '--merged', 'HEAD', '--list', 'v[0-9]*', '--sort=-version:refname']);
  const releaseTags = tagOutput
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag) && tag !== tagName);

  return releaseTags[0] || '';
}

function printRetryPreview(tagName, remoteTag, headOid) {
  console.log(`Retry ${tagName}:`);
  console.log(`Current remote target: ${formatCommit(remoteTag.targetOid)}`);
  console.log(`Replacement target:    ${formatCommit(headOid)}`);
  console.log('');
  console.log('Only retry a version that has not already been accepted or published by a store.');
  console.log('If any store accepted this version, bump the version instead of replacing its tag.');
  console.log('');
}

function printReleasePreview(tagName, preview) {
  console.log(`Release ${tagName} commit preview:`);
  if (preview.previousTag) {
    console.log(`Previous release tag: ${preview.previousTag}`);
  } else {
    console.log('Previous release tag: none found');
  }
  console.log(`Commit range: ${preview.logRange}`);
  console.log('');

  if (preview.commits.length === 0) {
    console.log('No commits found for this release range.');
    console.log('');
    return;
  }

  for (const commit of preview.commits) {
    console.log(`- ${commit}`);
  }
  console.log('');
}

async function confirmRelease(tagName) {
  const prompt = createPrompt();

  try {
    for (;;) {
      const answer = (await prompt.question(`Create and push ${tagName}? [Y/n] `)).trim().toLowerCase();

      if (answer === '' || answer === 'y' || answer === 'yes') {
        return true;
      }
      if (answer === 'n' || answer === 'no') {
        return false;
      }

      console.log('Please type Y or N.');
    }
  } finally {
    prompt.close();
  }
}

async function confirmRetry(tagName) {
  const prompt = createPrompt();

  try {
    const answer = (await prompt.question(
      `Type ${tagName} to replace its remote tag and rebuild the release: `
    )).trim();
    return answer === tagName;
  } finally {
    prompt.close();
  }
}

function createPrompt() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error([
      'Release confirmation requires an interactive terminal.',
      'Run this command from a terminal so you can confirm it.'
    ].join('\n'));
  }

  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function formatCommit(oid) {
  return gitOutput(['log', '-1', '--format=%h %s', oid]);
}

function shortOid(oid) {
  return oid.slice(0, 8);
}

function git(args) {
  const result = spawnGit(args);
  if (result.status !== 0) throwGitError(args, result);
  return result;
}

function gitOutput(args) {
  return git(args).stdout.trim();
}

function throwGitError(args, result) {
  if (result.stderr) process.stderr.write(result.stderr);
  throw new Error(`git ${args.join(' ')} failed.`);
}

function spawnGit(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (result.error) {
    throw result.error;
  }
  return result;
}

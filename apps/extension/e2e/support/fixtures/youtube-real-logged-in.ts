/** Real YouTube fixtures backed by the user's prepared signed-in Chrome profile. */
import { test as base, type FrameLocator, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { cp, lstat, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { launchNormalChromeExtensionContext } from '../chrome';
import { dumpDomOnFailure } from '../dom-dump';
import { getInstalledProfileExtensionId } from '../extension';
import {
  defaultLiveUrl,
  extensionDir,
  getLiveProfileDir,
  getLiveWorkingProfilesDir
} from '../paths';
import {
  getLiveUrl,
  getReplayUrl,
  getUnavailableSignedInReason,
  getUnavailableComposerReason,
  isChatComposerVisible,
  openLiveChat,
  startVideoPlaybackIfPaused
} from '../youtube-page';
import { resetRealYouTubeScenarioState } from './youtube-real-state';
import {
  getRealYouTubeBrowserUserAgent,
  shouldRunRealYouTubeHeadlessBrowserTest,
  type RealYouTubeSession
} from './browser-session';

const ACTIVE_CHROME_PROFILE_FILE_NAMES = new Set([
  'SingletonCookie',
  'SingletonLock',
  'SingletonSocket'
]);
const RUNTIME_CHROME_PROFILE_FILE_NAMES = new Set([
  ...ACTIVE_CHROME_PROFILE_FILE_NAMES,
  '.ytcq-playwright-profile.lock',
  'DevToolsActivePort'
]);

interface RealYouTubeLoggedInTestFixtures {
  realLiveLoggedInSession: RealYouTubeSession | null;
  realReplayLoggedInSession: RealYouTubeSession | null;
}

interface RealYouTubeLoggedInWorkerFixtures {
  realLiveLoggedInWorkerSession: RealYouTubeSession | null;
  realReplayLoggedInWorkerSession: RealYouTubeSession | null;
}

export const realYouTubeLoggedInTest = base.extend<
  RealYouTubeLoggedInTestFixtures,
  RealYouTubeLoggedInWorkerFixtures
>({
  realLiveLoggedInWorkerSession: [
    async ({ browserName }, use) => {
      void browserName;
      const session = await createLoggedInLiveSession();

      try {
        await use(session?.session || null);
      } finally {
        await session?.close();
      }
    },
    { scope: 'worker' }
  ],

  realReplayLoggedInWorkerSession: [
    async ({ browserName }, use) => {
      void browserName;
      const session = await createLoggedInReplaySession();

      try {
        await use(session?.session || null);
      } finally {
        await session?.close();
      }
    },
    { scope: 'worker' }
  ],

  realLiveLoggedInSession: async ({ realLiveLoggedInWorkerSession }, use, testInfo) => {
    if (realLiveLoggedInWorkerSession) {
      await resetRealYouTubeScenarioState(realLiveLoggedInWorkerSession);
    }
    try {
      await use(realLiveLoggedInWorkerSession);
    } finally {
      if (realLiveLoggedInWorkerSession) {
        await dumpDomOnFailure(realLiveLoggedInWorkerSession.context, testInfo);
      }
    }
  },

  realReplayLoggedInSession: async ({ realReplayLoggedInWorkerSession }, use, testInfo) => {
    if (realReplayLoggedInWorkerSession) {
      await resetRealYouTubeScenarioState(realReplayLoggedInWorkerSession);
    }
    try {
      await use(realReplayLoggedInWorkerSession);
    } finally {
      if (realReplayLoggedInWorkerSession) {
        await dumpDomOnFailure(realReplayLoggedInWorkerSession.context, testInfo);
      }
    }
  }
});

export function skipIfLoggedInYouTubeUnavailable(
  test: typeof realYouTubeLoggedInTest,
  session: RealYouTubeSession | null
): asserts session is RealYouTubeSession {
  test.skip(!session, getMissingLoggedInProfileReason());
  test.skip(Boolean(session?.unavailableReason), session?.unavailableReason || '');
}

async function createLoggedInLiveSession(): Promise<{
  close: () => Promise<void>;
  session: RealYouTubeSession;
} | null> {
  return createLoggedInYouTubeSession({
    label: 'live stream',
    profileName: 'youtube-real-live-logged-in',
    requireComposer: true,
    url: getLiveUrl()
  });
}

async function createLoggedInReplaySession(): Promise<{
  close: () => Promise<void>;
  session: RealYouTubeSession;
} | null> {
  return createLoggedInYouTubeSession({
    label: 'live replay',
    profileName: 'youtube-real-replay-logged-in',
    requireComposer: false,
    url: getReplayUrl()
  });
}

async function createLoggedInYouTubeSession({
  label,
  profileName,
  requireComposer,
  url
}: {
  label: string;
  profileName: string;
  requireComposer: boolean;
  url: string;
}): Promise<{
  close: () => Promise<void>;
  session: RealYouTubeSession;
} | null> {
  const sourceProfileDir = getLiveProfileDir();
  console.log(`Using logged-in Chrome source profile: ${sourceProfileDir}`);
  console.log(`Opening ${label}: ${url}`);

  if (!existsSync(path.join(sourceProfileDir, 'Default', 'Cookies'))) {
    return null;
  }

  const extensionId = await getInstalledProfileExtensionId(sourceProfileDir);
  if (!extensionId) {
    return null;
  }

  const profileDir = await prepareLoggedInWorkingProfile(sourceProfileDir, profileName);
  console.log(`Using logged-in Chrome working profile: ${profileDir}`);

  const headless = shouldRunRealYouTubeHeadlessBrowserTest();
  const chrome = await launchNormalChromeExtensionContext({
    headless,
    profileDir,
    userAgent: getRealYouTubeBrowserUserAgent(headless)
  });
  const { context } = chrome;
  const page = context.pages()[0] || (await context.newPage());
  const chat = await openLiveChat(page, url);
  if (!requireComposer) {
    await startVideoPlaybackIfPaused(page);
  }
  const unavailableReason = requireComposer
    ? await getComposerUnavailableReason(page, chat)
    : await getUnavailableSignedInReason(page);

  return {
    close: chrome.close,
    session: {
      context,
      page,
      chat,
      unavailableReason
    }
  };
}

async function getComposerUnavailableReason(page: Page, chat: FrameLocator): Promise<string> {
  return (await isChatComposerVisible(chat)) ? '' : await getUnavailableComposerReason(page, chat);
}

function getMissingLoggedInProfileReason(): string {
  return [
    'Skipping logged-in YouTube smoke because the prepared Chrome profile or installed extension was not found.',
    'Run `npm run test:e2e:youtube-login -w @chatenhancer/extension`, sign in to YouTube web, and make sure Chat Enhancer is loaded from:',
    extensionDir,
    `Pristine profile: ${getLiveProfileDir()}`,
    `Default livestream: ${defaultLiveUrl}`
  ].join(' ');
}

async function prepareLoggedInWorkingProfile(
  sourceProfileDir: string,
  profileName: string
): Promise<string> {
  const workingProfilesDir = getLiveWorkingProfilesDir();
  const profileDir = path.join(workingProfilesDir, profileName);

  if (
    isSameOrNestedPath(sourceProfileDir, profileDir) ||
    isSameOrNestedPath(profileDir, sourceProfileDir)
  ) {
    throw new Error(
      [
        `Logged-in source profile and working profile overlap: ${sourceProfileDir} -> ${profileDir}`,
        'Use a separate YTCQ_CHROME_PROFILE or YTCQ_CHROME_WORKING_PROFILES value.'
      ].join('\n')
    );
  }

  await assertSourceProfileClosed(sourceProfileDir);
  await mkdir(workingProfilesDir, { recursive: true });
  await removeProfilePath(profileDir);
  await cp(sourceProfileDir, profileDir, {
    recursive: true,
    filter: (source) => !isRootChromeRuntimePath(source, sourceProfileDir)
  });
  await removeChromeRuntimeFiles(profileDir);
  await removeCopiedExtensionServiceWorkerState(profileDir);

  return profileDir;
}

async function assertSourceProfileClosed(profileDir: string): Promise<void> {
  const activeFiles = await getExistingRootProfileFiles(
    profileDir,
    ACTIVE_CHROME_PROFILE_FILE_NAMES
  );
  if (activeFiles.length === 0) return;

  throw new Error(
    [
      `The logged-in source Chrome profile appears to be open: ${profileDir}`,
      'Close the Chrome window opened by `npm run test:e2e:youtube-login -w @chatenhancer/extension`, then rerun the E2E tests.',
      `Open-profile marker files: ${activeFiles.join(', ')}`
    ].join('\n')
  );
}

async function removeChromeRuntimeFiles(profileDir: string): Promise<void> {
  const runtimeFiles = await getExistingRootProfileFiles(
    profileDir,
    RUNTIME_CHROME_PROFILE_FILE_NAMES
  );
  await Promise.all(
    runtimeFiles.map((fileName) => {
      return removeProfilePath(path.join(profileDir, fileName));
    })
  );
}

async function removeCopiedExtensionServiceWorkerState(profileDir: string): Promise<void> {
  // Copied normal Chrome profiles can carry stale MV3 service-worker scripts for
  // unpacked extensions; Chrome rebuilds this state from dist on next launch.
  await removeProfilePath(path.join(profileDir, 'Default', 'Service Worker'));
}

async function removeProfilePath(profilePath: string): Promise<void> {
  await rm(profilePath, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 250
  });
}

async function getExistingRootProfileFiles(
  profileDir: string,
  fileNames: Set<string>
): Promise<string[]> {
  const existingFiles: string[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(profileDir, fileName);
    const exists = await lstat(filePath).then(
      () => true,
      () => false
    );
    if (exists) existingFiles.push(fileName);
  }
  return existingFiles;
}

function isRootChromeRuntimePath(filePath: string, profileDir: string): boolean {
  const relativePath = path.relative(profileDir, filePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false;
  if (relativePath.includes(path.sep)) return false;
  return RUNTIME_CHROME_PROFILE_FILE_NAMES.has(relativePath);
}

function isSameOrNestedPath(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return !relativePath || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

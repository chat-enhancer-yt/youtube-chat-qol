/** Shared state and lifecycle helpers for browser fixtures. */
import type { BrowserContext, FrameLocator, Page, WorkerInfo } from '@playwright/test';
import path from 'node:path';
import { clearExtensionStorageArea } from '../extension-storage';
import type { NativeChatTransport } from '../native-chat-transport';

const DEFAULT_MOCK_HEADLESS = true;
const DEFAULT_REAL_YOUTUBE_HEADLESS = true;
const REAL_YOUTUBE_HEADLESS_USER_AGENT = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/148.0.0.0 Safari/537.36'
].join(' ');

export interface ExtensionSession {
  context: BrowserContext;
  page: Page;
}

export type MockYouTubeSession = ExtensionSession;

export interface RealYouTubeSession {
  context: BrowserContext;
  page: Page;
  chat: FrameLocator;
  unavailableReason?: string;
}

export interface LiveYouTubeSession extends RealYouTubeSession {
  transport: NativeChatTransport;
}

export function getDisposableWorkerProfileDir(prefix: string, workerInfo: WorkerInfo): string {
  return path.join(
    workerInfo.project.outputDir,
    'profiles',
    `${prefix}-${process.pid}-${workerInfo.parallelIndex}-${workerInfo.workerIndex}`
  );
}

export async function isolateBrowserPage(page: Page): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.goto('about:blank', { timeout: 15_000, waitUntil: 'commit' });
      if (page.url() === 'about:blank') return;
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof Error) ||
        !error.message.includes('is interrupted by another navigation')
      ) {
        throw error;
      }
    }
    await page.waitForTimeout(250);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not isolate browser page from ${page.url()}.`);
}

export async function resetExtensionStorage(context: BrowserContext): Promise<void> {
  await clearExtensionStorageArea(context, 'local');
  await clearExtensionStorageArea(context, 'sync');
}

export function shouldRunHeadlessBrowserTest(): boolean {
  const override = process.env.YTCQ_TEST_HEADLESS;
  if (override === '0') return false;
  if (override === '1') return true;
  return DEFAULT_MOCK_HEADLESS;
}

export function shouldRunRealYouTubeHeadlessBrowserTest(): boolean {
  const override = process.env.YTCQ_TEST_LIVE_HEADLESS;
  if (override === '0') return false;
  if (override === '1') return true;
  return DEFAULT_REAL_YOUTUBE_HEADLESS;
}

export function getRealYouTubeBrowserUserAgent(headless: boolean): string | undefined {
  return headless
    ? process.env.YTCQ_TEST_LIVE_USER_AGENT || REAL_YOUTUBE_HEADLESS_USER_AGENT
    : undefined;
}

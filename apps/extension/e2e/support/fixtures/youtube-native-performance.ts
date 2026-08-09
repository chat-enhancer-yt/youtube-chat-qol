/** Fresh controlled YouTube session for each native performance case. */
import {
  expect,
  test as base,
  type BrowserContext,
  type FrameLocator,
  type Page
} from '@playwright/test';
import {
  closeExtensionContext,
  launchExtensionContext
} from '../chrome';
import { dumpDomOnFailure } from '../dom-dump';
import { NativeChatTransport } from '../native-chat-transport';
import { getLiveUrl, openLiveChat } from '../youtube-page';
import {
  getRealYouTubeBrowserUserAgent,
  shouldRunRealYouTubeHeadlessBrowserTest
} from './browser-session';

export interface NativePerformanceSession {
  context: BrowserContext;
  openChat: () => Promise<FrameLocator>;
  page: Page;
  transport: NativeChatTransport;
}

interface NativePerformanceFixtures {
  nativePerformanceSession: NativePerformanceSession;
}

export const nativeYouTubePerformanceTest = base.extend<NativePerformanceFixtures>({
  nativePerformanceSession: async ({ browserName }, use, testInfo) => {
    void browserName;
    const headless = shouldRunRealYouTubeHeadlessBrowserTest();
    const context = await launchExtensionContext({
      headless,
      profileDir: testInfo.outputPath('profile'),
      userAgent: getRealYouTubeBrowserUserAgent(headless)
    });
    const page = context.pages()[0] || (await context.newPage());
    const transport = await NativeChatTransport.install(page);
    let chat: FrameLocator | null = null;

    try {
      await use({
        context,
        openChat: async () => {
          if (chat) return chat;
          chat = await openLiveChat(page, getLiveUrl());
          await transport.waitUntilReady();
          const warmupMessageId = await transport.injectMessage({
            author: '@NativePerfWarmup',
            channel: 'UCNativePerfWarmup',
            text: '🙂'
          });
          await expect(chat.locator(`#${warmupMessageId}`)).toBeVisible({ timeout: 15_000 });
          return chat;
        },
        page,
        transport
      });
    } finally {
      await dumpDomOnFailure(context, testInfo);
      await transport.dispose();
      await closeExtensionContext(context);
    }
  }
});

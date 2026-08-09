/** Unattended real YouTube fixture that does not require a signed-in profile. */
import { test as base } from '@playwright/test';
import {
  closeExtensionContext,
  launchExtensionContext
} from '../chrome';
import { dumpDomOnFailure } from '../dom-dump';
import { NativeChatTransport } from '../native-chat-transport';
import { getLiveUrl, openLiveChat } from '../youtube-page';
import {
  resetRealYouTubeScenarioState,
  restoreRealYouTubeChatLiveEdge
} from './youtube-real-state';
import {
  getDisposableWorkerProfileDir,
  getRealYouTubeBrowserUserAgent,
  shouldRunRealYouTubeHeadlessBrowserTest,
  type LiveYouTubeSession
} from './browser-session';

interface RealYouTubeLoggedOutTestFixtures {
  liveLoggedOutSession: LiveYouTubeSession;
}

interface RealYouTubeLoggedOutWorkerFixtures {
  liveLoggedOutWorkerSession: LiveYouTubeSession;
}

export const realYouTubeLoggedOutTest = base.extend<
  RealYouTubeLoggedOutTestFixtures,
  RealYouTubeLoggedOutWorkerFixtures
>({
  liveLoggedOutWorkerSession: [
    async ({ browserName }, use, workerInfo) => {
      void browserName;
      const headless = shouldRunRealYouTubeHeadlessBrowserTest();
      const context = await launchExtensionContext({
        headless,
        profileDir: getDisposableWorkerProfileDir('youtube-live-logged-out', workerInfo),
        userAgent: getRealYouTubeBrowserUserAgent(headless)
      });

      const page = context.pages()[0] || (await context.newPage());
      const transport = await NativeChatTransport.install(page);

      try {
        const chat = await openLiveChat(page, getLiveUrl());
        await transport.waitUntilReady();
        await use({ context, page, chat, transport });
      } finally {
        await transport.dispose();
        await closeExtensionContext(context);
      }
    },
    { scope: 'worker' }
  ],

  liveLoggedOutSession: async (
    { liveLoggedOutWorkerSession },
    use,
    testInfo
  ) => {
    await resetRealYouTubeScenarioState(liveLoggedOutWorkerSession);
    await restoreRealYouTubeChatLiveEdge(liveLoggedOutWorkerSession);
    try {
      await use(liveLoggedOutWorkerSession);
    } finally {
      await dumpDomOnFailure(liveLoggedOutWorkerSession.context, testInfo);
    }
  }
});

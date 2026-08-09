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
  type ControlledRealYouTubeSession,
  type RealYouTubeSession
} from './browser-session';

interface RealYouTubeLoggedOutTestFixtures {
  realLiveLoggedOutSession: RealYouTubeSession;
  nativeTransportLiveLoggedOutSession: ControlledRealYouTubeSession;
}

interface RealYouTubeLoggedOutWorkerFixtures {
  realLiveLoggedOutWorkerSession: RealYouTubeSession;
  nativeTransportLiveLoggedOutWorkerSession: ControlledRealYouTubeSession;
}

export const realYouTubeLoggedOutTest = base.extend<
  RealYouTubeLoggedOutTestFixtures,
  RealYouTubeLoggedOutWorkerFixtures
>({
  realLiveLoggedOutWorkerSession: [
    async ({ browserName }, use, workerInfo) => {
      void browserName;
      const headless = shouldRunRealYouTubeHeadlessBrowserTest();
      const context = await launchExtensionContext({
        headless,
        profileDir: getDisposableWorkerProfileDir('youtube-real-logged-out', workerInfo),
        userAgent: getRealYouTubeBrowserUserAgent(headless)
      });

      const page = await context.newPage();
      const chat = await openLiveChat(page, getLiveUrl());

      try {
        await use({ context, page, chat });
      } finally {
        await closeExtensionContext(context);
      }
    },
    { scope: 'worker' }
  ],

  nativeTransportLiveLoggedOutWorkerSession: [
    async ({ browserName }, use, workerInfo) => {
      void browserName;
      const headless = shouldRunRealYouTubeHeadlessBrowserTest();
      const context = await launchExtensionContext({
        headless,
        profileDir: getDisposableWorkerProfileDir('youtube-native-transport-logged-out', workerInfo),
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

  realLiveLoggedOutSession: async ({ realLiveLoggedOutWorkerSession }, use, testInfo) => {
    await resetRealYouTubeScenarioState(realLiveLoggedOutWorkerSession);
    try {
      await use(realLiveLoggedOutWorkerSession);
    } finally {
      await dumpDomOnFailure(realLiveLoggedOutWorkerSession.context, testInfo);
    }
  },

  nativeTransportLiveLoggedOutSession: async (
    { nativeTransportLiveLoggedOutWorkerSession },
    use,
    testInfo
  ) => {
    await resetRealYouTubeScenarioState(nativeTransportLiveLoggedOutWorkerSession);
    await restoreRealYouTubeChatLiveEdge(nativeTransportLiveLoggedOutWorkerSession);
    try {
      await use(nativeTransportLiveLoggedOutWorkerSession);
    } finally {
      await dumpDomOnFailure(nativeTransportLiveLoggedOutWorkerSession.context, testInfo);
    }
  }
});

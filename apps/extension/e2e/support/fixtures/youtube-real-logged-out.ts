/** Unattended real YouTube fixture that does not require a signed-in profile. */
import { test as base } from '@playwright/test';
import { closeExtensionContext, launchExtensionContext } from '../chrome';
import { dumpDomOnFailure } from '../dom-dump';
import { getLiveUrl, openLiveChat } from '../youtube-page';
import { resetRealYouTubeScenarioState } from './youtube-real-state';
import {
  getDisposableWorkerProfileDir,
  getRealYouTubeBrowserUserAgent,
  shouldRunRealYouTubeHeadlessBrowserTest,
  type RealYouTubeSession
} from './browser-session';

interface RealYouTubeLoggedOutTestFixtures {
  realLiveLoggedOutSession: RealYouTubeSession;
}

interface RealYouTubeLoggedOutWorkerFixtures {
  realLiveLoggedOutWorkerSession: RealYouTubeSession;
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

  realLiveLoggedOutSession: async ({ realLiveLoggedOutWorkerSession }, use, testInfo) => {
    await resetRealYouTubeScenarioState(realLiveLoggedOutWorkerSession);
    try {
      await use(realLiveLoggedOutWorkerSession);
    } finally {
      await dumpDomOnFailure(realLiveLoggedOutWorkerSession.context, testInfo);
    }
  }
});

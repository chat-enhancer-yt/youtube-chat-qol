/**
 * Normalized Playwright fixtures for browser scenarios.
 *
 * Each plan-case spec imports one of these test objects, so reusable scenarios
 * can be passed directly to Playwright as `test(title, scenario)`.
 */
import type { BrowserContext, Page } from '@playwright/test';
import {
  extensionTest,
  realYouTubeLoggedInTest,
  realYouTubeLoggedOutTest,
  skipIfLoggedInYouTubeUnavailable,
  youtubeMockTest
} from './browser-fixtures';
import type { ChatSurface } from './chat-surface';

interface BrowserScenarioFixtures {
  chat: ChatSurface;
  context: BrowserContext;
  page: Page;
}

interface ExtensionScenarioFixtures {
  context: BrowserContext;
}

export const extensionScenarioTest = extensionTest.extend<ExtensionScenarioFixtures>({
  context: async ({ extensionContext }, use) => {
    await use(extensionContext);
  }
});

export const mockLiveLoggedInTest = youtubeMockTest.extend<BrowserScenarioFixtures>({
  chat: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.page);
  },

  context: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.context);
  },

  page: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.page);
  }
});

export const mockReplayLoggedInTest = youtubeMockTest.extend<BrowserScenarioFixtures>({
  chat: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.page);
  },

  context: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.context);
  },

  page: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.page);
  }
});

export const mockStudioLoggedInTest = youtubeMockTest.extend<BrowserScenarioFixtures>({
  chat: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.page);
  },

  context: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.context);
  },

  page: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.page);
  }
});

export const mockLiveLoggedOutTest = youtubeMockTest.extend<BrowserScenarioFixtures>({
  chat: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.page);
  },

  context: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.context);
  },

  page: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.page);
  }
});

export const realLiveLoggedInTest = realYouTubeLoggedInTest.extend<BrowserScenarioFixtures>({
  chat: async ({ realLiveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realLiveLoggedInSession);
    await use(realLiveLoggedInSession.chat);
  },

  context: async ({ realLiveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realLiveLoggedInSession);
    await use(realLiveLoggedInSession.context);
  },

  page: async ({ realLiveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realLiveLoggedInSession);
    await use(realLiveLoggedInSession.page);
  }
});

export const realReplayLoggedInTest = realYouTubeLoggedInTest.extend<BrowserScenarioFixtures>({
  chat: async ({ realReplayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realReplayLoggedInSession);
    await use(realReplayLoggedInSession.chat);
  },

  context: async ({ realReplayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realReplayLoggedInSession);
    await use(realReplayLoggedInSession.context);
  },

  page: async ({ realReplayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, realReplayLoggedInSession);
    await use(realReplayLoggedInSession.page);
  }
});

export const realLiveLoggedOutTest = realYouTubeLoggedOutTest.extend<BrowserScenarioFixtures>({
  chat: async ({ realLiveLoggedOutSession }, use) => {
    await use(realLiveLoggedOutSession.chat);
  },

  context: async ({ realLiveLoggedOutSession }, use) => {
    await use(realLiveLoggedOutSession.context);
  },

  page: async ({ realLiveLoggedOutSession }, use) => {
    await use(realLiveLoggedOutSession.page);
  }
});

/**
 * Normalized Playwright fixtures for browser scenarios.
 *
 * Thin catalog runners import these test objects, so reusable scenarios can be
 * passed directly to Playwright as `test(title, scenario)`.
 */
import type { BrowserContext, FrameLocator, Page } from '@playwright/test';
import {
  extensionTest,
  realYouTubeLoggedInTest,
  realYouTubeLoggedOutTest,
  skipIfLoggedInYouTubeUnavailable,
  youtubeMockTest
} from './browser-fixtures';
import type { ChatSurface } from './chat-surface';
import {
  createMockControlledChat,
  type ControlledChat
} from './controlled-chat';
import type { NativeChatTransport } from './native-chat-transport';

interface BrowserScenarioFixtures {
  chat: ChatSurface;
  context: BrowserContext;
  page: Page;
}

interface ControlledBrowserScenarioFixtures extends BrowserScenarioFixtures {
  controlledChat: ControlledChat;
}

interface LiveBrowserScenarioFixtures extends Omit<
  ControlledBrowserScenarioFixtures,
  'chat'
> {
  chat: FrameLocator;
  transport: NativeChatTransport;
}

interface ReplayBrowserScenarioFixtures extends BrowserScenarioFixtures {
  controlledChat: undefined;
}

interface ExtensionScenarioFixtures {
  context: BrowserContext;
}

export const extensionScenarioTest = extensionTest.extend<ExtensionScenarioFixtures>({
  context: async ({ extensionContext }, use) => {
    await use(extensionContext);
  }
});

export const mockLiveLoggedInTest = youtubeMockTest.extend<ControlledBrowserScenarioFixtures>({
  chat: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.page);
  },

  context: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.context);
  },

  page: async ({ mockLoggedInSession }, use) => {
    await use(mockLoggedInSession.page);
  },

  controlledChat: async ({ mockLoggedInSession }, use) => {
    await use(createMockControlledChat(mockLoggedInSession.page));
  }
});

export const mockReplayLoggedInTest = youtubeMockTest.extend<ControlledBrowserScenarioFixtures>({
  chat: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.page);
  },

  context: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.context);
  },

  page: async ({ mockLoggedInReplaySession }, use) => {
    await use(mockLoggedInReplaySession.page);
  },

  controlledChat: async ({ mockLoggedInReplaySession }, use) => {
    await use(createMockControlledChat(mockLoggedInReplaySession.page));
  }
});

export const mockStudioLoggedInTest = youtubeMockTest.extend<ControlledBrowserScenarioFixtures>({
  chat: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.page);
  },

  context: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.context);
  },

  page: async ({ mockStudioLoggedInSession }, use) => {
    await use(mockStudioLoggedInSession.page);
  },

  controlledChat: async ({ mockStudioLoggedInSession }, use) => {
    await use(createMockControlledChat(mockStudioLoggedInSession.page));
  }
});

export const mockLiveLoggedOutTest = youtubeMockTest.extend<ControlledBrowserScenarioFixtures>({
  chat: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.page);
  },

  context: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.context);
  },

  page: async ({ mockLoggedOutSession }, use) => {
    await use(mockLoggedOutSession.page);
  },

  controlledChat: async ({ mockLoggedOutSession }, use) => {
    await use(createMockControlledChat(mockLoggedOutSession.page));
  }
});

export const liveLoggedInTest = realYouTubeLoggedInTest.extend<
  LiveBrowserScenarioFixtures
>({
  chat: async ({ liveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(
      realYouTubeLoggedInTest,
      liveLoggedInSession
    );
    await use(liveLoggedInSession.chat);
  },

  context: async ({ liveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(
      realYouTubeLoggedInTest,
      liveLoggedInSession
    );
    await use(liveLoggedInSession.context);
  },

  page: async ({ liveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(
      realYouTubeLoggedInTest,
      liveLoggedInSession
    );
    await use(liveLoggedInSession.page);
  },

  controlledChat: async ({ liveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(
      realYouTubeLoggedInTest,
      liveLoggedInSession
    );
    await use(liveLoggedInSession.transport);
  },

  transport: async ({ liveLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(
      realYouTubeLoggedInTest,
      liveLoggedInSession
    );
    await use(liveLoggedInSession.transport);
  }
});

export const replayLoggedInTest = realYouTubeLoggedInTest.extend<
  ReplayBrowserScenarioFixtures
>({
  chat: async ({ replayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, replayLoggedInSession);
    await use(replayLoggedInSession.chat);
  },

  context: async ({ replayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, replayLoggedInSession);
    await use(replayLoggedInSession.context);
  },

  page: async ({ replayLoggedInSession }, use) => {
    skipIfLoggedInYouTubeUnavailable(realYouTubeLoggedInTest, replayLoggedInSession);
    await use(replayLoggedInSession.page);
  },

  controlledChat: async ({ replayLoggedInSession }, use) => {
    void replayLoggedInSession;
    await use(undefined);
  }
});

export const liveLoggedOutTest = realYouTubeLoggedOutTest.extend<
  LiveBrowserScenarioFixtures
>({
  chat: async ({ liveLoggedOutSession }, use) => {
    await use(liveLoggedOutSession.chat);
  },

  context: async ({ liveLoggedOutSession }, use) => {
    await use(liveLoggedOutSession.context);
  },

  page: async ({ liveLoggedOutSession }, use) => {
    await use(liveLoggedOutSession.page);
  },

  controlledChat: async ({ liveLoggedOutSession }, use) => {
    await use(liveLoggedOutSession.transport);
  },

  transport: async ({ liveLoggedOutSession }, use) => {
    await use(liveLoggedOutSession.transport);
  }
});

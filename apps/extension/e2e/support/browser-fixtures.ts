/** Public entry points for the focused browser fixture implementations. */
export { expect } from '@playwright/test';
export { extensionTest } from './fixtures/extension';
export {
  realYouTubeLoggedInTest,
  skipIfLoggedInYouTubeUnavailable
} from './fixtures/youtube-real-logged-in';
export { realYouTubeLoggedOutTest } from './fixtures/youtube-real-logged-out';
export { youtubeMockTest } from './fixtures/youtube-mock';
export type {
  ExtensionSession,
  MockYouTubeSession,
  RealYouTubeSession
} from './fixtures/browser-session';

/** Binds every deterministic YouTube catalog target to its Playwright fixture. */
import {
  registerYouTubeScenarios,
  youtubeScenarioTargets as target
} from '../../catalog/youtube';
import {
  mockLiveLoggedInTest,
  mockLiveLoggedOutTest,
  mockReplayLoggedInTest,
  mockStudioLoggedInTest
} from '../../support/scenario-fixtures';

// Playwright applies this to the whole spec, including the other mock fixtures below.
mockLiveLoggedInTest.describe.configure({ mode: 'parallel' });

registerYouTubeScenarios(mockLiveLoggedInTest, target.mockLiveLoggedIn);
registerYouTubeScenarios(mockLiveLoggedOutTest, target.mockLiveLoggedOut);
registerYouTubeScenarios(mockReplayLoggedInTest, target.mockReplayLoggedIn);
registerYouTubeScenarios(mockStudioLoggedInTest, target.mockStudioLoggedIn);

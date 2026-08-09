/** Runs the logged-out catalog against a real YouTube live chat. */
import {
  registerYouTubeScenarios,
  youtubeScenarioTargets as target
} from '../../catalog/youtube';
import { liveLoggedOutTest as test } from '../../support/scenario-fixtures';

test.describe.configure({ mode: 'parallel' });

registerYouTubeScenarios(test, target.liveLoggedOut);

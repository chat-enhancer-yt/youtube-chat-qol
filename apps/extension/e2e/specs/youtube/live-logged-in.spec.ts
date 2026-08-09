/** Runs the signed-in catalog against a real YouTube live chat. */
import {
  registerYouTubeScenarios,
  youtubeScenarioTargets as target
} from '../../catalog/youtube';
import { liveLoggedInTest as test } from '../../support/scenario-fixtures';

registerYouTubeScenarios(test, target.liveLoggedIn);

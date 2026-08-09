/** Runs the signed-in replay catalog against a real YouTube replay. */
import {
  registerYouTubeScenarios,
  youtubeScenarioTargets as target
} from '../../catalog/youtube';
import { replayLoggedInTest as test } from '../../support/scenario-fixtures';

registerYouTubeScenarios(test, target.replayLoggedIn);

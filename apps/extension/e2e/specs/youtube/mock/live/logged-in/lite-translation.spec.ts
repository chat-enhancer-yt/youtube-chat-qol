/** Logged-in mock scenarios shared by Lite mode and message translation. */
import { liteModeMockRenderingAndFallbackScenario } from '../../../../../scenarios/lite-mode/rendering';
import { liteModeStoredPreferenceReloadScenario } from '../../../../../scenarios/lite-mode/persistence';
import { liteModeToggleAndRestoreScenario } from '../../../../../scenarios/lite-mode/toggle';
import { liteModeTranslationContinuityScenario } from '../../../../../scenarios/lite-mode/translation';
import { liteModeTimestampsScenario } from '../../../../../scenarios/lite-mode/timestamps';
import {
  replacedTranslationToggleSurfacesScenario,
  translationDisplayScenario
} from '../../../../../scenarios/translation/display';
import { translationSettingsReactScenario } from '../../../../../scenarios/translation/settings';
import { mockLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test(
  'logged-in mock: Lite mode toggles on, renders readable messages, and restores native chat',
  liteModeToggleAndRestoreScenario
);
test(
  'logged-in mock: Lite renderer handles sanitized rows and compatibility fallback',
  liteModeMockRenderingAndFallbackScenario
);
test(
  'logged-in mock: stored Lite mode preserves history across a reload',
  liteModeStoredPreferenceReloadScenario
);
test('logged-in mock: Lite mode mirrors the native Timestamps setting', liteModeTimestampsScenario);
test(
  'logged-in mock: translations carry from native history into Lite mode',
  liteModeTranslationContinuityScenario
);
test('logged-in mock: translation display modes render correctly', translationDisplayScenario);
test(
  'logged-in mock: replaced translations toggle across chat surfaces',
  replacedTranslationToggleSurfacesScenario
);
test('logged-in mock: translate chat setting reacts live', translationSettingsReactScenario);

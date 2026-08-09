/** Logged-in mock scenarios for extension setup and settings surfaces. */
import { attachScenario } from '../../../../../scenarios/attach';
import { settingsMenuScenario } from '../../../../../scenarios/menus';
import { popupResetScenario } from '../../../../../scenarios/popup-reset';
import { popupSettingsBehaviorScenario, settingsMenuBehaviorScenario } from '../../../../../scenarios/settings';
import { tabAlertScenario } from '../../../../../scenarios/tab-alert';
import { mockLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test(
  'logged-in mock: extension attaches and current tab action reports connected status',
  attachScenario
);
test('logged-in mock: chat settings menu receives extension controls', settingsMenuScenario);
test('logged-in mock: chat settings menu toggles persist options', settingsMenuBehaviorScenario);
test('logged-in mock: extension popup settings persist options', popupSettingsBehaviorScenario);
test('logged-in mock: popup reset restores defaults and clears local data', popupResetScenario);
test('logged-in mock: background tab alert updates title and favicon', tabAlertScenario);

/**
 * Logged-out mock YouTube browser scenarios.
 *
 * This deterministic surface covers extension behavior that works without a
 * chat composer. Add reusable feature checks under `e2e/scenarios/`,
 * then include them here when they should run against the logged-out mock.
 */
import {
  inboxRecordCreationAndJumpScenario
} from '../../../../../scenarios/inbox';
import { translationDisplayScenario } from '../../../../../scenarios/translation/display';
import { translationSettingsReactScenario } from '../../../../../scenarios/translation/settings';
import { settingsMenuScenario } from '../../../../../scenarios/menus';
import {
  profileCardAeroOriginHighlightScenario,
  profileCardAvatarAccentScenario
} from '../../../../../scenarios/profile/aero';
import { profileCardRecentMessagesScenario } from '../../../../../scenarios/profile/card';
import { profileMentionOpensRecentMessagesScenario } from '../../../../../scenarios/profile/mentions';
import { settingsMenuBehaviorScenario } from '../../../../../scenarios/settings';
import { mockLiveLoggedOutTest as test } from '../../../../../support/scenario-fixtures';

test('logged-out mock: chat settings menu receives extension controls', settingsMenuScenario);
test('logged-out mock: chat settings menu toggles persist options', settingsMenuBehaviorScenario);
test('logged-out mock: translation display modes render correctly', translationDisplayScenario);
test('logged-out mock: translate chat setting reacts live', translationSettingsReactScenario);
test('logged-out mock: inbox saves keyword matches, highlights them, and jumps back to chat', inboxRecordCreationAndJumpScenario);
test('logged-out mock: profile card opens from a chat avatar', profileCardRecentMessagesScenario);
test(
  'logged-out mock: Aero highlights the current message in the profile card',
  profileCardAeroOriginHighlightScenario
);
test(
  'logged-out mock: profile avatar color accents normal themes and softly reflects in Aero',
  profileCardAvatarAccentScenario
);
test(
  'logged-out mock: clicking a mentioned handle opens that user’s recent messages',
  profileMentionOpensRecentMessagesScenario
);

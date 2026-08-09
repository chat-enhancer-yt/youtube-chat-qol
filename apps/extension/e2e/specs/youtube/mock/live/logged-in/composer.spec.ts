/** Logged-in mock scenarios for composer-owned behavior. */
import {
  chatCommandAutocompleteScenario,
  chatCommandsExpandAndApplySettingsScenario
} from '../../../../../scenarios/chat-commands';
import { chatDraftRecoveryScenario } from '../../../../../scenarios/chat-drafts';
import {
  composerTranslationControlsOpenScenario,
  mockedComposerTranslationProtectedDraftScenario,
  mockedComposerTranslationScenario
} from '../../../../../scenarios/translation/composer';
import { frequentEmojiPersistenceScenario } from '../../../../../scenarios/frequent-emojis';
import { mockLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test('logged-in mock: composer translation controls open', composerTranslationControlsOpenScenario);
test(
  'logged-in mock: composer translation translates draft text with mocked Google Translate',
  mockedComposerTranslationScenario
);
test(
  'logged-in mock: composer translation preserves mentions and emoji placeholders',
  mockedComposerTranslationProtectedDraftScenario
);
test('logged-in mock: unsent chat draft is restored after refresh', chatDraftRecoveryScenario);
test(
  'logged-in mock: frequent emojis are tracked, rendered, and persisted',
  frequentEmojiPersistenceScenario
);
test(
  'logged-in mock: chat commands expand and apply settings',
  chatCommandsExpandAndApplySettingsScenario
);
test(
  'logged-in mock: chat command autocomplete suggests names and arguments',
  chatCommandAutocompleteScenario
);

/** Logged-in mock scenarios for message, bookmark, Inbox, and profile surfaces. */
import {
  bookmarkMessageMenuScenario,
  bookmarkPopupRenderingScenario
} from '../../../../../scenarios/bookmarks';
import {
  inboxDirectMentionScenario,
  inboxKeywordOverlapPreservesProfileMentionScenario,
  inboxRecordCreationAndJumpScenario
} from '../../../../../scenarios/inbox';
import {
  authorQuoteDraftScenario,
  authorMentionDraftScenario,
  mentionMenuDraftScenario,
  quoteMenuDraftScenario
} from '../../../../../scenarios/message-actions';
import { messageMenuScenario } from '../../../../../scenarios/menus';
import { profileCardRecentMessagesScenario } from '../../../../../scenarios/profile/card';
import { mockLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test(
  'logged-in mock: message context menu receives save, quote, and mention actions',
  messageMenuScenario
);
test(
  'logged-in mock: saved message persists and appears in Bookmarks',
  bookmarkMessageMenuScenario
);
test(
  'logged-in mock: popup fully renders saved messages and remembered rings',
  bookmarkPopupRenderingScenario
);
test('logged-in mock: mention menu action writes a draft only', mentionMenuDraftScenario);
test('logged-in mock: quote menu action writes a draft only', quoteMenuDraftScenario);
test(
  'logged-in mock: inbox saves keyword matches, highlights them, and jumps back to chat',
  inboxRecordCreationAndJumpScenario
);
test('logged-in mock: inbox saves direct mentions and highlights them', inboxDirectMentionScenario);
test(
  'logged-in mock: watched keyword overlapping a handle keeps the profile mention clickable',
  inboxKeywordOverlapPreservesProfileMentionScenario
);
test('logged-in mock: profile card opens from a chat avatar', profileCardRecentMessagesScenario);
test('logged-in mock: author click writes a mention draft only', authorMentionDraftScenario);
test('logged-in mock: author Alt-click writes a quote draft only', authorQuoteDraftScenario);

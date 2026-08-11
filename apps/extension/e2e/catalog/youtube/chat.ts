import { attachScenario } from '../../scenarios/attach';
import { bookmarkMessageMenuScenario } from '../../scenarios/bookmarks';
import {
  chatCommandAutocompleteScenario,
  chatCommandsExpandAndApplySettingsScenario
} from '../../scenarios/chat-commands';
import { chatDraftRecoveryScenario } from '../../scenarios/chat-drafts';
import { frequentEmojiPersistenceScenario } from '../../scenarios/frequent-emojis';
import {
  authorMentionDraftScenario,
  authorQuoteDraftScenario,
  mentionMenuDraftScenario,
  quoteMenuDraftScenario
} from '../../scenarios/message-actions';
import {
  messageMenuScenario,
  nativeMenuStacksAboveExtensionPanelScenario,
  settingsMenuScenario
} from '../../scenarios/menus';
import { settingsMenuBehaviorScenario } from '../../scenarios/settings';
import {
  youtubeScenarioPairs as pair,
  youtubeScenarioTargets as target,
  type YouTubeScenario
} from './model';

const allChatSurfaces = [
  ...pair.liveLoggedIn,
  ...pair.liveLoggedOut,
  ...pair.replayLoggedIn
] as const;
const sharedLoggedInLive = pair.liveLoggedIn;
const menuSurfaces = [
  ...pair.liveLoggedIn,
  ...pair.replayLoggedIn
] as const;

export const chatScenarios: readonly YouTubeScenario[] = [
  {
    title: 'chat settings menu receives extension controls',
    run: settingsMenuScenario,
    on: allChatSurfaces
  },
  {
    title: 'chat settings menu toggles persist options',
    run: settingsMenuBehaviorScenario,
    on: [...pair.liveLoggedIn, ...pair.liveLoggedOut]
  },
  {
    title: 'native YouTube menus appear above extension panels',
    run: nativeMenuStacksAboveExtensionPanelScenario,
    on: [target.mockLiveLoggedOut],
    reason: 'Requires deterministic overlapping panel and menu geometry.'
  },
  {
    title: 'message context menu receives save, quote, and mention actions',
    run: messageMenuScenario,
    on: menuSurfaces
  },
  {
    title: 'saved message persists and appears in Bookmarks',
    run: bookmarkMessageMenuScenario,
    on: menuSurfaces
  },
  {
    title: 'mention menu action writes a draft only',
    run: mentionMenuDraftScenario,
    on: pair.liveLoggedIn
  },
  {
    title: 'quote menu action writes a draft only',
    run: quoteMenuDraftScenario,
    on: pair.liveLoggedIn
  },
  {
    title: 'author click writes a mention draft only',
    run: authorMentionDraftScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'author Alt-click writes a quote draft only',
    run: authorQuoteDraftScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'unsent chat draft is restored after refresh',
    run: chatDraftRecoveryScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'frequent emojis are tracked, rendered, and persisted',
    run: frequentEmojiPersistenceScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'chat commands expand and apply settings',
    run: chatCommandsExpandAndApplySettingsScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'chat command autocomplete suggests names and arguments',
    run: chatCommandAutocompleteScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'extension attaches and current tab action reports connected status',
    run: attachScenario,
    on: [...pair.liveLoggedIn, ...pair.liveLoggedOut]
  }
];

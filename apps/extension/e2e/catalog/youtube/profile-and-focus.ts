import {
  focusPanelOpensFromAuthorScenario,
  focusPanelReceivesNewMessagesScenario
} from '../../scenarios/focus';
import {
  profileCardAeroOriginHighlightScenario,
  profileCardAvatarAccentScenario
} from '../../scenarios/profile/aero';
import {
  profileCardHistoryPagingScenario,
  profileCardReceivesNewMessagesScenario,
  profileCardRecentMessagesScenario,
  profileCardResizeScenario
} from '../../scenarios/profile/card';
import { profileMentionOpensRecentMessagesScenario } from '../../scenarios/profile/mentions';
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

export const profileAndFocusScenarios: readonly YouTubeScenario[] = [
  {
    title: 'profile card opens from a chat avatar',
    run: profileCardRecentMessagesScenario,
    on: allChatSurfaces
  },
  {
    title: 'Focus receives an injected incoming message',
    run: focusPanelReceivesNewMessagesScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'an open profile receives injected incoming messages',
    run: profileCardReceivesNewMessagesScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'profile history pages through injected incoming messages',
    run: profileCardHistoryPagingScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'profile panels resize without stretching sparse message rows',
    run: profileCardResizeScenario,
    on: [target.mockLiveLoggedOut],
    reason: 'Requires deterministic incoming messages and pointer geometry.'
  },
  {
    title: 'inline profile mentions open injected author history',
    run: profileMentionOpensRecentMessagesScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'focus panel opens from an author and follows their messages',
    run: focusPanelOpensFromAuthorScenario,
    on: allChatSurfaces
  },
  {
    title: 'Aero highlights the current message in the profile card',
    run: profileCardAeroOriginHighlightScenario,
    on: [target.mockLiveLoggedOut],
    reason: 'Requires the synthetic Aero theme fixture.'
  },
  {
    title: 'profile avatar color accents normal themes and softly reflects in Aero',
    run: profileCardAvatarAccentScenario,
    on: [target.mockLiveLoggedOut],
    reason: 'Requires deterministic fixture themes and avatar colors.'
  }
];

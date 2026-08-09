import {
  inboxDirectMentionScenario,
  inboxKeywordOverlapPreservesProfileMentionScenario,
  inboxOpensFromHeaderScenario,
  inboxRecordCreationAndJumpScenario,
  inboxReplayPrefetchTimingScenario
} from '../../scenarios/inbox';
import {
  youtubeScenarioPairs as pair,
  youtubeScenarioTargets as target,
  type YouTubeScenario
} from './model';

export const inboxScenarios: readonly YouTubeScenario[] = [
  {
    title: 'Inbox records, highlights, and jumps to an injected keyword match',
    run: inboxRecordCreationAndJumpScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'keyword highlights preserve clickable profile mentions',
    run: inboxKeywordOverlapPreservesProfileMentionScenario,
    on: pair.liveLoggedOut
  },
  {
    title: 'signed-in direct mentions reach Inbox through injected incoming data',
    run: inboxDirectMentionScenario,
    on: pair.liveLoggedIn
  },
  {
    title: 'Inbox opens from the chat header',
    run: inboxOpensFromHeaderScenario,
    on: [...pair.liveLoggedIn, ...pair.liveLoggedOut, ...pair.replayLoggedIn]
  },
  {
    title: 'Inbox saves replay feed matches and jumps back to chat',
    run: inboxRecordCreationAndJumpScenario,
    on: [target.mockReplayLoggedIn],
    reason: 'Requires direct control of the deterministic replay feed.'
  },
  {
    title: 'Inbox waits until prefetched messages reach their video time',
    run: inboxReplayPrefetchTimingScenario,
    on: [target.mockReplayLoggedIn],
    reason: 'Requires direct control of the deterministic replay feed and clock.'
  },
  {
    title: 'Inbox saves normalized Studio feed matches and jumps back to chat',
    run: inboxRecordCreationAndJumpScenario,
    on: [target.mockStudioLoggedIn],
    reason: 'Requires the distinct deterministic YouTube Studio fixture.'
  }
];

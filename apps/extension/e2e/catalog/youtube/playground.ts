import {
  playgroundBountyHuntingCountdownStartScenario,
  playgroundBountyHuntingCutoffScenario,
  playgroundBountyHuntingRoundStartScenario,
  playgroundBountyHuntingWitnessScenario
} from '../../scenarios/playground/bounty-hunting';
import {
  playgroundChessInviteAndMoveScenario,
  playgroundChessTurnGatingScenario
} from '../../scenarios/playground/chess';
import {
  playgroundActiveGameControlsScenario,
  playgroundAvailabilityToggleScenario,
  playgroundIncomingInviteAcceptScenario,
  playgroundIncomingInviteIgnoreScenario,
  playgroundInviteCancelScenario,
  playgroundRestoreStateWithInvitesOffScenario,
  playgroundVersionMismatchScenario
} from '../../scenarios/playground/lobby';
import {
  playgroundReplayTriviaAnswerScenario,
  playgroundReplayTriviaInviteScenario
} from '../../scenarios/playground/replay-trivia';
import {
  playgroundStickAroundActiveOverlayControlsScenario,
  playgroundStickAroundComputerOverlayScenario,
  playgroundStickAroundLiteOverlayScenario
} from '../../scenarios/playground/stick-around';
import { youtubeScenarioTargets as target, type YouTubeScenario } from './model';

const reason =
  'Requires the deterministic Playground socket/backend fixture rather than a production backend.';
const mockLive = [target.mockLiveLoggedIn] as const;
const mockReplay = [target.mockReplayLoggedIn] as const;

export const playgroundScenarios: readonly YouTubeScenario[] = [
  {
    title: 'Playground Games invites a chess opponent and sends a move',
    run: playgroundChessInviteAndMoveScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Chess blocks moves off-turn and accepts them on-turn',
    run: playgroundChessTurnGatingScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games accepts an incoming invite and opens the started game',
    run: playgroundIncomingInviteAcceptScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games ignores an incoming invite and removes it from the lobby',
    run: playgroundIncomingInviteIgnoreScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games resumes, hides, and leaves an active game',
    run: playgroundActiveGameControlsScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games toggles lobby availability',
    run: playgroundAvailabilityToggleScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground restores games and invites while invite availability is off',
    run: playgroundRestoreStateWithInvitesOffScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground explains and blocks incompatible game versions',
    run: playgroundVersionMismatchScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Stick Around opens as a chat feed overlay after inviting the computer',
    run: playgroundStickAroundComputerOverlayScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Stick Around lobby controls work over an active overlay',
    run: playgroundStickAroundActiveOverlayControlsScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Stick Around mounts its playable overlay on Lite chat',
    run: playgroundStickAroundLiteOverlayScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games cancels a pending outgoing invite',
    run: playgroundInviteCancelScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Bounty Hunting round start divider attaches to the boundary message',
    run: playgroundBountyHuntingRoundStartScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Bounty Hunting rejects pre-start messages and claims post-start messages',
    run: playgroundBountyHuntingCutoffScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Bounty Hunting reports post-start witness messages',
    run: playgroundBountyHuntingWitnessScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Bounty Hunting countdown starts with server timestamp cutoff',
    run: playgroundBountyHuntingCountdownStartScenario,
    on: mockLive,
    reason
  },
  {
    title: 'Playground Games invites a Replay Trivia opponent and opens the panel',
    run: playgroundReplayTriviaInviteScenario,
    on: mockReplay,
    reason
  },
  {
    title: 'Replay Trivia submits one selected answer',
    run: playgroundReplayTriviaAnswerScenario,
    on: mockReplay,
    reason
  }
];

/** Logged-in mock scenarios for Playground games and lobby behavior. */
import {
  playgroundBountyHuntingCountdownStartScenario,
  playgroundBountyHuntingCutoffScenario,
  playgroundBountyHuntingRoundStartScenario,
  playgroundBountyHuntingWitnessScenario
} from '../../../../../scenarios/playground/bounty-hunting';
import {
  playgroundChessInviteAndMoveScenario,
  playgroundChessTurnGatingScenario
} from '../../../../../scenarios/playground/chess';
import {
  playgroundActiveGameControlsScenario,
  playgroundAvailabilityToggleScenario,
  playgroundIncomingInviteAcceptScenario,
  playgroundIncomingInviteIgnoreScenario,
  playgroundInviteCancelScenario,
  playgroundRestoreStateWithInvitesOffScenario,
  playgroundVersionMismatchScenario
} from '../../../../../scenarios/playground/lobby';
import {
  playgroundStickAroundActiveOverlayControlsScenario,
  playgroundStickAroundComputerOverlayScenario,
  playgroundStickAroundLiteOverlayScenario
} from '../../../../../scenarios/playground/stick-around';
import { mockLiveLoggedInTest as test } from '../../../../../support/scenario-fixtures';

test(
  'logged-in mock: Playground Games invites a chess opponent and sends a move',
  playgroundChessInviteAndMoveScenario
);
test(
  'logged-in mock: Chess blocks moves off-turn and accepts them on-turn',
  playgroundChessTurnGatingScenario
);
test(
  'logged-in mock: Playground Games accepts an incoming invite and opens the started game',
  playgroundIncomingInviteAcceptScenario
);
test(
  'logged-in mock: Playground Games ignores an incoming invite and removes it from the lobby',
  playgroundIncomingInviteIgnoreScenario
);
test(
  'logged-in mock: Playground Games resumes, hides, and leaves an active game',
  playgroundActiveGameControlsScenario
);
test(
  'logged-in mock: Playground Games toggles lobby availability',
  playgroundAvailabilityToggleScenario
);
test(
  'logged-in mock: Playground restores games and invites while invite availability is off',
  playgroundRestoreStateWithInvitesOffScenario
);
test(
  'logged-in mock: Playground explains and blocks incompatible game versions',
  playgroundVersionMismatchScenario
);
test(
  'logged-in mock: Stick Around opens as a chat feed overlay after inviting the computer',
  playgroundStickAroundComputerOverlayScenario
);
test(
  'logged-in mock: Stick Around lobby controls work over an active overlay',
  playgroundStickAroundActiveOverlayControlsScenario
);
test(
  'logged-in mock: Stick Around mounts its playable overlay on Lite chat',
  playgroundStickAroundLiteOverlayScenario
);
test(
  'logged-in mock: Playground Games cancels a pending outgoing invite',
  playgroundInviteCancelScenario
);
test(
  'logged-in mock: Bounty Hunting round start divider attaches to the boundary message',
  playgroundBountyHuntingRoundStartScenario
);
test(
  'logged-in mock: Bounty Hunting rejects pre-start messages and claims post-start messages',
  playgroundBountyHuntingCutoffScenario
);
test(
  'logged-in mock: Bounty Hunting reports post-start witness messages',
  playgroundBountyHuntingWitnessScenario
);
test(
  'logged-in mock: Bounty Hunting countdown starts with server timestamp cutoff',
  playgroundBountyHuntingCountdownStartScenario
);

import { liteModeAeroBehaviorScenario } from '../../scenarios/lite-mode/aero';
import { liteModeLiveSustainedScenario } from '../../scenarios/lite-mode/live';
import { liteModeMessageActionsScenario } from '../../scenarios/lite-mode/message-actions';
import { liteModeLiveParticipantsScenario } from '../../scenarios/lite-mode/participants';
import { liteModeStoredPreferenceReloadScenario } from '../../scenarios/lite-mode/persistence';
import { liteModeMockRenderingAndFallbackScenario } from '../../scenarios/lite-mode/rendering';
import { liteModeReplayRapidSeekScenario } from '../../scenarios/lite-mode/replay';
import { liteModeUnavailableInStudioScenario } from '../../scenarios/lite-mode/studio';
import { liteModeTimestampsScenario } from '../../scenarios/lite-mode/timestamps';
import { liteModeToggleAndRestoreScenario } from '../../scenarios/lite-mode/toggle';
import { liteModeTranslationContinuityScenario } from '../../scenarios/lite-mode/translation';
import {
  youtubeScenarioPairs as pair,
  youtubeScenarioTargets as target,
  type YouTubeScenario
} from './model';

const sharedLoggedInLive = pair.liveLoggedIn;

export const liteModeScenarios: readonly YouTubeScenario[] = [
  {
    title: 'Lite mode toggles on, renders readable messages, and restores native chat',
    run: liteModeToggleAndRestoreScenario,
    on: [...sharedLoggedInLive, ...pair.replayLoggedIn]
  },
  {
    title: 'Lite message actions stay inside the chat viewport',
    run: liteModeMessageActionsScenario,
    on: [...pair.liveLoggedIn, ...pair.replayLoggedIn]
  },
  {
    title: 'stored Lite mode preserves history across a reload',
    run: liteModeStoredPreferenceReloadScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'Lite mode mirrors the native Timestamps setting',
    run: liteModeTimestampsScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'translations carry from native history into Lite mode',
    run: liteModeTranslationContinuityScenario,
    on: sharedLoggedInLive
  },
  {
    title: 'Lite Aero keeps its skin, readable rows, and header control',
    run: liteModeAeroBehaviorScenario,
    on: pair.replayLoggedIn
  },
  {
    title: 'Lite mode keeps receiving after the native feed is discarded',
    run: liteModeLiveSustainedScenario,
    on: [target.liveLoggedIn],
    reason: 'Requires a naturally populated live YouTube feed.'
  },
  {
    title: 'Lite mode preserves the native Participants panel',
    run: liteModeLiveParticipantsScenario,
    on: [target.liveLoggedIn],
    reason: 'Requires YouTube to populate its real Participants panel.'
  },
  {
    title: 'Lite chat recovers after rapid progress-bar seeking',
    run: liteModeReplayRapidSeekScenario,
    on: [target.replayLoggedIn],
    reason: 'Requires YouTube’s real replay player and progress-bar behavior.'
  },
  {
    title: 'Lite renderer handles sanitized rows and compatibility fallback',
    run: liteModeMockRenderingAndFallbackScenario,
    on: [target.mockLiveLoggedIn],
    reason: 'Constructs sanitized and malformed fixture-only renderer rows.'
  },
  {
    title: 'Lite mode remains unavailable',
    run: liteModeUnavailableInStudioScenario,
    on: [target.mockStudioLoggedIn],
    reason: 'Requires the distinct deterministic YouTube Studio fixture.'
  }
];

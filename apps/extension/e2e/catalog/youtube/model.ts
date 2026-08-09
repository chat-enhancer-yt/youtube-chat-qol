import type { BrowserScenario } from '../../scenarios/types';

export const youtubeScenarioTargets = {
  mockLiveLoggedIn: 'mock-live-logged-in',
  mockLiveLoggedOut: 'mock-live-logged-out',
  mockReplayLoggedIn: 'mock-replay-logged-in',
  mockStudioLoggedIn: 'mock-studio-logged-in',
  liveLoggedIn: 'live-logged-in',
  liveLoggedOut: 'live-logged-out',
  replayLoggedIn: 'replay-logged-in'
} as const;

export type YouTubeScenarioTarget =
  (typeof youtubeScenarioTargets)[keyof typeof youtubeScenarioTargets];

export interface YouTubeScenario {
  readonly on: readonly YouTubeScenarioTarget[];
  readonly reason?: string;
  readonly run: BrowserScenario;
  readonly title: string;
}

const target = youtubeScenarioTargets;

export const youtubeScenarioPairs = {
  liveLoggedIn: [target.mockLiveLoggedIn, target.liveLoggedIn],
  liveLoggedOut: [target.mockLiveLoggedOut, target.liveLoggedOut],
  replayLoggedIn: [target.mockReplayLoggedIn, target.replayLoggedIn]
} as const;

export const youtubeScenarioTargetLabels: Record<YouTubeScenarioTarget, string> = {
  [target.mockLiveLoggedIn]: 'logged-in mock',
  [target.mockLiveLoggedOut]: 'logged-out mock',
  [target.mockReplayLoggedIn]: 'logged-in mock replay',
  [target.mockStudioLoggedIn]: 'logged-in mock Studio',
  [target.liveLoggedIn]: 'logged-in live',
  [target.liveLoggedOut]: 'logged-out live',
  [target.replayLoggedIn]: 'logged-in live replay'
};

/** Public entry point for regular YouTube browser-scenario coverage. */
import { chatScenarios } from './chat';
import { inboxScenarios } from './inbox';
import { liteModeScenarios } from './lite-mode';
import {
  youtubeScenarioTargetLabels,
  youtubeScenarioTargets,
  type YouTubeScenario,
  type YouTubeScenarioTarget
} from './model';
import { playgroundScenarios } from './playground';
import { profileAndFocusScenarios } from './profile-and-focus';
import { targetSpecificScenarios } from './target-specific';
import { translationScenarios } from './translation';
import { validateYouTubeScenarios } from './validate';

const youtubeScenarios: readonly YouTubeScenario[] = [
  ...chatScenarios,
  ...profileAndFocusScenarios,
  ...inboxScenarios,
  ...translationScenarios,
  ...liteModeScenarios,
  ...playgroundScenarios,
  ...targetSpecificScenarios
];

validateYouTubeScenarios(youtubeScenarios);

export { youtubeScenarioTargets };

export function getYouTubeScenarios(
  target: YouTubeScenarioTarget
): readonly YouTubeScenario[] {
  return youtubeScenarios.filter((scenario) => scenario.on.includes(target));
}

export function getYouTubeScenarioTitle(
  target: YouTubeScenarioTarget,
  scenario: YouTubeScenario
): string {
  return `${youtubeScenarioTargetLabels[target]}: ${scenario.title}`;
}

export function registerYouTubeScenarios(
  test: (title: string, run: YouTubeScenario['run']) => void,
  target: YouTubeScenarioTarget
): void {
  for (const scenario of getYouTubeScenarios(target)) {
    test(getYouTubeScenarioTitle(target, scenario), scenario.run);
  }
}

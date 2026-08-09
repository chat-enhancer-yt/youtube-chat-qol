import type { BrowserScenario } from '../../scenarios/types';
import {
  youtubeScenarioPairs,
  type YouTubeScenario,
  type YouTubeScenarioTarget
} from './model';

export function validateYouTubeScenarios(scenarios: readonly YouTubeScenario[]): void {
  const titles = new Set<string>();
  const registrations = new Map<BrowserScenario, Set<YouTubeScenarioTarget>>();

  for (const scenario of scenarios) {
    if (!scenario.title.trim() || titles.has(scenario.title)) {
      throw new Error(`Duplicate or empty YouTube scenario title: ${scenario.title}`);
    }
    titles.add(scenario.title);

    if (scenario.on.length === 0) {
      throw new Error(`YouTube scenario "${scenario.title}" needs at least one target.`);
    }
    if (new Set(scenario.on).size !== scenario.on.length) {
      throw new Error(`YouTube scenario "${scenario.title}" repeats a target.`);
    }

    let completePairCount = 0;
    let hasIncompletePair = false;
    for (const [first, second] of Object.values(youtubeScenarioPairs)) {
      const includesFirst = scenario.on.includes(first);
      const includesSecond = scenario.on.includes(second);
      if (includesFirst !== includesSecond) hasIncompletePair = true;
      if (includesFirst && includesSecond) completePairCount += 1;
    }

    if (scenario.reason !== undefined && !scenario.reason.trim()) {
      throw new Error(`YouTube scenario "${scenario.title}" has an empty exception reason.`);
    }
    if ((hasIncompletePair || completePairCount === 0) && !scenario.reason?.trim()) {
      throw new Error(
        `YouTube scenario "${scenario.title}" needs an exception reason for its target coverage.`
      );
    }

    const registeredTargets = registrations.get(scenario.run) ?? new Set();
    for (const target of scenario.on) {
      if (registeredTargets.has(target)) {
        throw new Error(
          `Scenario ${scenario.run.name || scenario.title} is registered twice for ${target}.`
        );
      }
      registeredTargets.add(target);
    }
    registrations.set(scenario.run, registeredTargets);
  }
}

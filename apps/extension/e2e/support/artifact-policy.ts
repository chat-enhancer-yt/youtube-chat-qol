/**
 * E2E artifact privacy policy.
 *
 * Mock tests use synthetic chat content, so they can keep rich diagnostics in
 * CI. Real YouTube tests, including locally controlled continuation tests, can
 * still contain live page or signed-in account metadata; keep their screenshots,
 * traces, videos, and DOM dumps local by default unless CI explicitly opts in.
 */
import type { TestInfo } from '@playwright/test';

const ENABLED_VALUES = new Set(['1', 'true', 'yes']);

export function shouldCaptureE2eFailureArtifacts(projectName: string): boolean {
  const usesLiveYouTube = [
    'youtube-real-',
    'youtube-native-transport-'
  ].some((prefix) => projectName.startsWith(prefix));
  if (!usesLiveYouTube) return true;
  if (process.env.GITHUB_ACTIONS !== 'true') return true;
  return ENABLED_VALUES.has((process.env.YTCQ_CAPTURE_LIVE_E2E_ARTIFACTS || '').toLowerCase());
}

export function shouldCaptureDomDump(testInfo: TestInfo): boolean {
  return shouldCaptureE2eFailureArtifacts(testInfo.project.name);
}

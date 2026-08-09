/**
 * Shared filesystem and URL paths for end-to-end tests.
 *
 * Keeping these values in one place makes the fixture tests, real YouTube
 * tests, and login helper agree on the built extension location and the
 * persistent logged-in Chrome profile.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const supportDir = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(supportDir, '..', '..');

export const repoRoot = path.resolve(extensionRoot, '..', '..');
export const extensionDir = path.join(repoRoot, 'dist', 'extension-chrome');
// Pin the active high-traffic stream because the channel-level /live route can
// switch to a quieter concurrent stream without enough text chat for smoke tests.
export const defaultLiveUrl = 'https://www.youtube.com/watch?v=X4VbdwhkE10';
export const defaultReplayUrl = 'https://www.youtube.com/watch?v=SHt3FyE-VIQ';

export function getLiveProfileDir(): string {
  return path.resolve(process.env.YTCQ_CHROME_PROFILE || path.join(getLiveWorkingProfilesDir(), 'pristine'));
}

export function getLiveWorkingProfilesDir(): string {
  return path.resolve(process.env.YTCQ_CHROME_WORKING_PROFILES || path.join(repoRoot, '.chrome-test-profiles'));
}

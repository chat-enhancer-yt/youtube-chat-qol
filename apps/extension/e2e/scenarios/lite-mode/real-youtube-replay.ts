/** Real YouTube replay interactions used by Lite mode scenarios. */
import { expect, type Locator } from '@playwright/test';
import { waitForYouTubeContentVideo } from '../../support/youtube-page';
import type { BrowserScenario } from '../types';

export async function performRapidReplaySeeks({
  duration,
  finalTime,
  page,
  seekFractions,
  seekTolerance,
  video
}: {
  duration: number;
  finalTime: number;
  page: Parameters<BrowserScenario>[0]['page'];
  seekFractions: number[];
  seekTolerance: number;
  video: Locator;
}): Promise<void> {
  const player = page.locator('#movie_player').first();
  const progressBar = player.locator('.ytp-progress-bar').first();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const fraction of seekFractions) {
      // A large replay seek can trigger a mid-roll ad. Resume the burst on the
      // content progress bar instead of sending the remaining clicks to the ad.
      await waitForYouTubeContentVideo(page);
      await player.hover();
      await expect(progressBar).toBeVisible({ timeout: 20_000 });
      await expect(progressBar).not.toHaveAttribute('aria-disabled', 'true');
      const bounds = await progressBar.boundingBox();
      if (!bounds) throw new Error('YouTube replay progress bar has no visible bounds.');
      await page.mouse.click(bounds.x + bounds.width * fraction, bounds.y + bounds.height / 2);
      await page.waitForTimeout(100);
    }

    await waitForYouTubeContentVideo(page);
    const currentTime = await video.evaluate(
      (element) => (element as HTMLVideoElement).currentTime
    );
    if (Math.abs(currentTime - finalTime) <= seekTolerance) return;
  }

  const currentTime = await video.evaluate(
    (element) => (element as HTMLVideoElement).currentTime
  );
  throw new Error(
    `YouTube progress-bar seeks did not reach the final replay position: ${JSON.stringify({
      currentTime,
      duration,
      finalTime,
      seekTolerance
    })}`
  );
}

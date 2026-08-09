/** Regression coverage for delayed real-YouTube chat-panel rendering. */
import { expect } from '@playwright/test';
import { openLiveChat } from '../support/youtube-page';
import type { BrowserScenario } from './types';

export const delayedChatPanelNavigationScenario: BrowserScenario = async ({ page }) => {
  const liveUrl = 'https://www.youtube.com/watch?v=delayed-chat';
  await page.route(liveUrl, (route) =>
    route.fulfill({
      body: `<!doctype html>
        <title>Delayed chat fixture</title>
        <script>
          setTimeout(() => {
            const button = document.createElement('button');
            button.setAttribute('aria-label', 'Open panel');
            button.textContent = 'Open panel';
            button.addEventListener('click', () => {
              const frame = document.createElement('iframe');
              frame.id = 'chatframe';
              frame.srcdoc = '<style>yt-live-chat-renderer { display: block; height: 100px; width: 100px; }</style><yt-live-chat-renderer></yt-live-chat-renderer>';
              document.body.append(frame);
            });
            document.body.append(button);
          }, 2_000);
        </script>`,
      contentType: 'text/html',
      status: 200
    })
  );

  const chat = await openLiveChat(page, liveUrl);

  await expect(page.locator('iframe#chatframe')).toBeVisible();
  await expect(chat.locator('yt-live-chat-renderer')).toBeVisible();
};

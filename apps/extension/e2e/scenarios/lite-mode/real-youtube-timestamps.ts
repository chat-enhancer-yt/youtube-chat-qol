/** Real YouTube timestamp-menu interactions used by Lite mode scenarios. */
import { expect, type Locator } from '@playwright/test';
import { openSettingsMenu } from '../../support/menu-openers';
import type { ChatSurface } from '../types';

export async function waitForLiteTimestampState(
  root: Locator,
  enabled: boolean
): Promise<boolean> {
  return expect
    .poll(() => root.getAttribute('data-ytcq-show-timestamps'), { timeout: 5_000 })
    .toBe(String(enabled))
    .then(
      () => true,
      () => false
    );
}

export async function hasVisibleLiteTimestampText(timestamp: Locator): Promise<boolean> {
  return timestamp.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Boolean(element.textContent?.trim())
    );
  });
}

export async function getNativeTimestampsEnabled(chat: ChatSurface): Promise<boolean> {
  const menu = await openSettingsMenu(chat);
  const { toggle } = await findTimestampToggle(menu);
  const enabled = await isToggleEnabled(toggle);
  await chat.locator('body').press('Escape');
  return enabled;
}

export async function setNativeTimestampsEnabled(
  chat: ChatSurface,
  enabled: boolean
): Promise<void> {
  const menu = await openSettingsMenu(chat);
  const { renderer, toggle } = await findTimestampToggle(menu);
  if ((await isToggleEnabled(toggle)) !== enabled) {
    const item = renderer.locator('tp-yt-paper-item').first();
    if (await item.count()) await item.click();
    else await renderer.click();
  }
  await chat.locator('body').press('Escape');
  await expect.poll(() => getNativeTimestampsEnabled(chat), { timeout: 8_000 }).toBe(enabled);
}

async function findTimestampToggle(menu: Locator): Promise<{ renderer: Locator; toggle: Locator }> {
  const renderers = menu.locator('yt-live-chat-toggle-renderer');
  for (let index = 0; index < (await renderers.count()); index += 1) {
    const renderer = renderers.nth(index);
    const text = await renderer.innerText().catch(() => '');
    const toggle = renderer.locator('tp-yt-paper-toggle-button').first();
    const ariaLabel = await toggle.getAttribute('aria-label').catch(() => '');
    if (/timestamps/i.test(text) || /timestamps/i.test(ariaLabel || '')) {
      await expect(renderer).toBeVisible();
      return { renderer, toggle };
    }
  }
  throw new Error(
    `YouTube Timestamps toggle was not found. Menu text: ${(await menu.innerText()).slice(0, 500)}`
  );
}

async function isToggleEnabled(toggle: Locator): Promise<boolean> {
  return (
    (await toggle.getAttribute('aria-pressed')) === 'true' ||
    (await toggle.getAttribute('checked')) !== null ||
    (await toggle.getAttribute('active')) !== null
  );
}

/** Browser scenario for Lite mode aero behavior. */
import { expect, test } from '@playwright/test';
import {
  setExtensionStorageValues,
  withExtensionStorageValues
} from '../../support/extension-storage';
import type { BrowserScenario } from '../types';
import {
  SHOULD_CAPTURE_AERO_SCREENSHOTS,
  sampleHeaderIconThemes
} from './real-youtube-audit';
import type { AeroEvidence } from './real-youtube-audit';
import {
  clearLiteTestCooldown,
  expectStoredLiteMode
} from './assertions';
import {
  LITE_BUTTON_SELECTOR,
  LITE_NATIVE_DISCARDED_ATTRIBUTE,
  LITE_NATIVE_RESTORE_SELECTOR,
  LITE_ROOT_SELECTOR,
  NATIVE_LIST_SELECTOR
} from './selectors';

export const liteModeAeroBehaviorScenario: BrowserScenario = async ({ chat, context }) => {
  test.setTimeout(120_000);
  const button = chat.locator(LITE_BUTTON_SELECTOR).first();
  const root = chat.locator(LITE_ROOT_SELECTOR);
  let evidence: AeroEvidence | null = null;

  await withExtensionStorageValues(
    context,
    'sync',
    { chatSkin: 'aero', liteModeEnabled: false },
    async () => {
      try {
        await clearLiteTestCooldown(chat);
        await expect(button).toBeVisible({ timeout: 20_000 });
        await expect(button).toHaveAttribute('aria-pressed', 'false');
        await expect(chat.locator('html')).toHaveAttribute('data-ytcq-chat-skin', 'aero');
        await chat
          .locator('yt-live-chat-text-message-renderer')
          .last()
          .waitFor({ state: 'visible', timeout: 30_000 });

        const inactiveIcons = await sampleHeaderIconThemes(chat, false);

        const startupAt = Date.now();
        await button.click();
        await expectStoredLiteMode(context, true);
        await expect(root).toBeVisible({ timeout: 20_000 });
        const liteText = root.locator('.ytcq-lite-message-text').last();
        await liteText.waitFor({ state: 'visible', timeout: 30_000 });
        const startupMs = Date.now() - startupAt;
        await expect(chat.locator('html')).toHaveAttribute(
          LITE_NATIVE_DISCARDED_ATTRIBUTE,
          'true',
          { timeout: 20_000 }
        );
        await expect(chat.locator(NATIVE_LIST_SELECTOR)).toHaveCount(0);

        const activeIcons = await sampleHeaderIconThemes(
          chat,
          true,
          SHOULD_CAPTURE_AERO_SCREENSHOTS
        );
        await expect(liteText.locator('#author-photo')).toBeVisible();
        await expect(liteText.locator('#author-name')).toBeVisible();
        await expect(liteText.locator('#message')).toBeVisible();
        await expect.poll(() => liteText.locator('#author-name').innerText()).not.toBe('');
        await expect.poll(() => liteText.locator('#message').innerText()).not.toBe('');
        await expect(root.locator('.ytcq-lite-scroller')).toBeVisible();
        await expect(root.locator('.ytcq-lite-toolbar')).toHaveCount(0);

        evidence = {
          activeIcons,
          inactiveIcons,
          liteMessageCount: await root.locator('.ytcq-lite-message').count(),
          startupMs
        };

        for (const icon of [...inactiveIcons, ...activeIcons]) {
          expect(icon.buttonColor).not.toBe('rgb(0, 0, 0)');
          expect(icon.svgFill).not.toBe('rgb(0, 0, 0)');
          expect(icon.headerBackgroundImage).not.toBe('none');
          expect(icon.headerBoxShadow).not.toBe('none');
          expect(icon.headerPosition).toBe('relative');
          expect(icon.headerZIndex).toBe('1');
        }
        for (const icon of activeIcons) {
          expect(icon.buttonColor).not.toBe('rgb(255, 255, 255)');
          expect(icon.svgFilter).not.toBe('none');
        }

        await test.step('Restore native chat without losing the selected skin', async () => {
          await button.click();
          await expectStoredLiteMode(context, false);
          await expect(root).toHaveCount(0, { timeout: 20_000 });
          await expect(chat.locator(NATIVE_LIST_SELECTOR).first()).toBeVisible({
            timeout: 20_000
          });
          await expect(chat.locator('yt-live-chat-text-message-renderer').first()).toBeVisible({
            timeout: 30_000
          });
          await expect(chat.locator(LITE_NATIVE_RESTORE_SELECTOR)).toHaveCount(0, {
            timeout: 20_000
          });
          await expect(chat.locator('html')).toHaveAttribute('data-ytcq-chat-skin', 'aero');
          await expect(button).toHaveAttribute('aria-pressed', 'false');
        });
      } finally {
        await setExtensionStorageValues(context, 'sync', { liteModeEnabled: false }).catch(
          () => undefined
        );
        await root.waitFor({ state: 'detached', timeout: 8_000 }).catch(() => undefined);
        await chat
          .locator(NATIVE_LIST_SELECTOR)
          .first()
          .waitFor({
            state: 'visible',
            timeout: 20_000
          })
          .catch(() => undefined);
        await expect(chat.locator(LITE_NATIVE_RESTORE_SELECTOR))
          .toHaveCount(0, {
            timeout: 20_000
          })
          .catch(() => undefined);
        await clearLiteTestCooldown(chat).catch(() => undefined);
        await test
          .info()
          .attach('lite-aero-behavior-evidence', {
            body: JSON.stringify(evidence, null, 2),
            contentType: 'application/json'
          })
          .catch(() => undefined);
      }
    }
  );
};

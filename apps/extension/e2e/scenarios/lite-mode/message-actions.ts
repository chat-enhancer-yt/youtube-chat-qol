/** Browser scenario for Lite mode's YouTube-backed message action menu. */
import { expect, test } from '@playwright/test';
import {
  setExtensionStorageValues,
  withExtensionStorageValues
} from '../../support/extension-storage';
import type { BrowserScenario } from '../types';
import { clearLiteTestCooldown, expectStoredLiteMode } from './assertions';
import {
  LITE_BUTTON_SELECTOR,
  LITE_ROOT_SELECTOR,
  NATIVE_MESSAGE_SELECTOR
} from './selectors';

export const liteModeMessageActionsScenario: BrowserScenario = async ({
  chat,
  context,
  controlledChat
}) => {
  test.setTimeout(120_000);
  await withExtensionStorageValues(context, 'sync', { liteModeEnabled: false }, async () => {
    const button = chat.locator(LITE_BUTTON_SELECTOR).first();
    const root = chat.locator(LITE_ROOT_SELECTOR);
    try {
      await clearLiteTestCooldown(chat);
      const targetMessageId = await controlledChat?.injectMessage({
        author: '@MenuFixture',
        channel: 'UCYtcqLiteMessageActions',
        text: 'Open the Lite message actions'
      });
      await expect(chat.locator(NATIVE_MESSAGE_SELECTOR).first()).toBeVisible({ timeout: 30_000 });
      await expect(button).toBeVisible({ timeout: 20_000 });
      await button.click();
      await expectStoredLiteMode(context, true);
      await expect(root).toBeVisible({ timeout: 20_000 });

      await test.step('Open Lite message actions without leaving the chat viewport', async () => {
        const targetAttribute = 'data-ytcq-test-lite-menu-target';
        const targetRow = targetMessageId
          ? root.locator(`[data-message-id=${JSON.stringify(targetMessageId)}]`).first()
          : root.locator('.ytcq-lite-message-text').last();
        await expect(targetRow).toBeVisible({ timeout: 30_000 });
        await targetRow.evaluate(
          (row, attribute) => row.setAttribute(attribute, ''),
          targetAttribute
        );
        const row = root.locator(`[${targetAttribute}]`);
        const actionButton = row.locator('.ytcq-lite-message-menu-button');
        const menu = chat
          .locator('ytd-menu-popup-renderer')
          .filter({
            has: chat.locator('.ytcq-context-item[data-ytcq-action="save-message"]')
          })
          .last();
        try {
          await row.hover();
          await expect(actionButton).toBeVisible();
          await expect(actionButton).toHaveAttribute('aria-haspopup', 'menu');
          await expect(actionButton).toHaveAttribute('aria-expanded', 'false');

          await row.locator('#message').click();
          await expect(menu).toBeVisible();
          await menu.locator('[data-ytcq-action="save-message"] .ytcq-paper-item').press('Escape');
          await expect(menu).toBeHidden();

          await actionButton.press('Enter');
          await expect(menu).toBeVisible();
          await expect(actionButton).toHaveAttribute('aria-expanded', 'true');
          await expect(menu.locator('[data-ytcq-action="save-message"]')).toBeVisible();
          await expect(menu.locator('[data-ytcq-action="mention"]')).toBeVisible();
          await expect(menu.locator('[data-ytcq-action="quote"]')).toBeVisible();
          const bounds = await menu.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
              inside:
                rect.left >= 0 &&
                rect.top >= 0 &&
                rect.right <= window.innerWidth &&
                rect.bottom <= window.innerHeight
            };
          });
          expect(bounds.inside).toBe(true);

          await menu.locator('[data-ytcq-action="save-message"] .ytcq-paper-item').press('Escape');
          await expect(menu).toBeHidden();
          await expect(actionButton).toHaveAttribute('aria-expanded', 'false');
        } finally {
          await row
            .evaluate((element, attribute) => {
              element.removeAttribute(attribute);
            }, targetAttribute)
            .catch(() => undefined);
        }
      });
    } finally {
      await setExtensionStorageValues(context, 'sync', { liteModeEnabled: false }).catch(
        () => undefined
      );
      await root.waitFor({ state: 'detached', timeout: 8_000 }).catch(() => undefined);
      await clearLiteTestCooldown(chat).catch(() => undefined);
    }
  });
};

/** Browser scenarios for Lite mode toggle behavior. */
import { expect, test } from '@playwright/test';
import {
  setExtensionStorageValues,
  withExtensionStorageValues
} from '../../support/extension-storage';
import type { BrowserScenario } from '../types';
import {
  clearLiteTestCooldown,
  expectLiteAtLiveEdge,
  expectStoredLiteMode
} from './assertions';
import {
  LITE_BUTTON_SELECTOR,
  LITE_DOCUMENT_MARKER_ATTRIBUTE,
  LITE_NATIVE_DISCARDED_ATTRIBUTE,
  LITE_NATIVE_RESTORE_SELECTOR,
  LITE_ROOT_SELECTOR,
  NATIVE_LIST_SELECTOR,
  NATIVE_MESSAGE_SELECTOR
} from './selectors';

export const liteModeToggleAndRestoreScenario: BrowserScenario = async ({ chat, context }) => {
  test.setTimeout(120_000);
  await withExtensionStorageValues(context, 'sync', { liteModeEnabled: false }, async () => {
    const button = chat.locator(LITE_BUTTON_SELECTOR).first();
    const root = chat.locator(LITE_ROOT_SELECTOR);
    try {
      await clearLiteTestCooldown(chat);
      await expect(chat.locator(NATIVE_LIST_SELECTOR).first()).toBeVisible({ timeout: 20_000 });
      await expect(chat.locator(NATIVE_MESSAGE_SELECTOR).first()).toBeVisible({ timeout: 30_000 });
      const documentMarker = `${Date.now()}-${Math.random()}`;
      await chat.locator('html').evaluate((html, marker) => {
        html.setAttribute(marker.attribute, marker.value);
      }, {
        attribute: LITE_DOCUMENT_MARKER_ATTRIBUTE,
        value: documentMarker
      });

      await test.step('Enable Lite mode from the chat header', async () => {
        await expect(button).toBeVisible({ timeout: 20_000 });
        await expect(button).toHaveAttribute('aria-pressed', 'false');
        await button.click();
        await expectStoredLiteMode(context, true);
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(root).toBeVisible({ timeout: 20_000 });
        await expect(chat.locator('html')).toHaveAttribute(
          LITE_DOCUMENT_MARKER_ATTRIBUTE,
          documentMarker
        );
        await expect(chat.locator('html')).toHaveAttribute(
          LITE_NATIVE_DISCARDED_ATTRIBUTE,
          'true',
          { timeout: 20_000 }
        );
        await expect(chat.locator(NATIVE_LIST_SELECTOR)).toHaveCount(0);
      });

      await test.step('Keep the lightweight feed readable and usable', async () => {
        const row = root.locator('.ytcq-lite-message-text').last();
        const author = row.locator('#author-name');
        const message = row.locator('#message');
        await expect(root.locator('.ytcq-lite-scroller')).toBeVisible();
        await expect(row).toBeVisible({ timeout: 30_000 });
        await expect(row.locator('#author-photo')).toBeVisible();
        await expect(author).toBeVisible();
        await expect(message).toBeVisible();
        await expect.poll(() => author.innerText()).not.toBe('');
        await expect.poll(() => message.innerText()).not.toBe('');
        await expect(root.locator('.ytcq-lite-toolbar')).toHaveCount(0);
        await expect(button).toBeVisible();
        await expectLiteAtLiveEdge(root);
      });

      await test.step('Open Lite message actions without leaving the chat viewport', async () => {
        const targetAttribute = 'data-ytcq-test-lite-menu-target';
        const latestRow = root.locator('.ytcq-lite-message-text').last();
        await latestRow.evaluate(
          (row, attribute) => row.setAttribute(attribute, ''),
          targetAttribute
        );
        const row = root.locator(`[${targetAttribute}]`);
        const actionButton = row.locator('.ytcq-lite-message-menu-button');
        const menu = chat.locator('ytd-menu-popup-renderer').filter({
          has: chat.locator('.ytcq-context-item[data-ytcq-action="save-message"]')
        }).last();
        try {
          await row.hover();
          await expect(actionButton).toBeVisible();
          await expect(actionButton).toHaveAttribute('aria-haspopup', 'menu');
          await expect(actionButton).toHaveAttribute('aria-expanded', 'false');

          await row.locator('#message').click();
          await expect(menu).toBeVisible();
          await menu.locator('[data-ytcq-action="save-message"] .ytcq-paper-item').press('Escape');
          await expect(menu).toHaveCount(0);

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
          await expect(menu).toHaveCount(0);
          await expect(actionButton).toHaveAttribute('aria-expanded', 'false');
        } finally {
          await row
            .evaluate((element, attribute) => {
              element.removeAttribute(attribute);
            }, targetAttribute)
            .catch(() => undefined);
        }
      });

      await test.step('Disable Lite mode and restore native chat', async () => {
        await button.click();
        await expectStoredLiteMode(context, false);
        await expect(root).toHaveCount(0, { timeout: 20_000 });
        await expect(chat.locator(NATIVE_LIST_SELECTOR).first()).toBeVisible({ timeout: 30_000 });
        await expect(chat.locator(NATIVE_MESSAGE_SELECTOR).first()).toBeVisible({
          timeout: 30_000
        });
        await expect(chat.locator(LITE_NATIVE_RESTORE_SELECTOR)).toHaveCount(0, {
          timeout: 20_000
        });
        await expect(chat.locator('html')).not.toHaveAttribute(
          LITE_NATIVE_DISCARDED_ATTRIBUTE,
          'true'
        );
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
      await clearLiteTestCooldown(chat).catch(() => undefined);
    }
  });
};

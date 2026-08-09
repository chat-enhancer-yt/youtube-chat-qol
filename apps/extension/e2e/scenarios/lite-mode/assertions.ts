/** User-visible Lite mode assertions and temporary state helpers. */
import { expect, type BrowserContext, type Locator } from '@playwright/test';
import {
  getExtensionStorageValues,
  withExtensionStorageValues
} from '../../support/extension-storage';
import { withMockedTranslationEndpoint } from '../../support/translation-endpoint';
import type { ChatSurface } from '../types';
import { LITE_SESSION_COOLDOWN_KEY } from './selectors';

const MOCK_LITE_TARGET_LANGUAGE = 'cy';
const MOCK_LITE_TRANSLATED_TEXT = 'Lite translated result';

export async function expectLiteReplacementTranslation({
  context,
  row
}: {
  context: BrowserContext;
  row: Locator;
}): Promise<void> {
  await withMockedTranslationEndpoint(context, MOCK_LITE_TRANSLATED_TEXT, async () => {
    await withExtensionStorageValues(
      context,
      'sync',
      {
        lastTranslationTarget: MOCK_LITE_TARGET_LANGUAGE,
        targetLanguage: MOCK_LITE_TARGET_LANGUAGE,
        translationDisplay: 'replace'
      },
      async () => {
        const message = row.locator('#message').first();
        const icon = message.locator('.ytcq-replaced-translation-icon').first();
        await expect(row).toHaveClass(/ytcq-translation-replaced/, { timeout: 20_000 });
        await expect(message).toContainText(MOCK_LITE_TRANSLATED_TEXT);
        await expect(icon).toBeVisible();
        await expect(icon.locator('svg')).toBeVisible();
        await expect(icon).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(message).toHaveCSS('text-decoration-line', 'underline');
        await expect(message).toHaveCSS('text-decoration-style', 'dotted');
      }
    );
  });
}

export async function expectLiteAtLiveEdge(root: Locator): Promise<void> {
  await expect(root).toHaveAttribute('data-ytcq-following-live-edge', 'true');
  const scroller = root.locator('.ytcq-lite-scroller');
  await expect
    .poll(
      () =>
        scroller.evaluate((element) =>
          Math.max(0, element.scrollHeight - element.scrollTop - element.clientHeight)
        ),
      { message: 'Expected Lite mode to start at the live edge.' }
    )
    .toBeLessThanOrEqual(2);
}

export async function clearLiteTestCooldown(chat: ChatSurface): Promise<void> {
  await chat.locator('body').evaluate((_body, key) => {
    window.sessionStorage.removeItem(key);
  }, LITE_SESSION_COOLDOWN_KEY);
}

export async function expectStoredLiteMode(
  context: Parameters<typeof getExtensionStorageValues>[0],
  expected: boolean
): Promise<void> {
  await expect
    .poll(
      async () => {
        const values = await getExtensionStorageValues(context, 'sync', ['liteModeEnabled']);
        return values.liteModeEnabled;
      },
      {
        message: `Expected Lite mode storage to be ${String(expected)}.`,
        timeout: 5_000
      }
    )
    .toBe(expected);
}

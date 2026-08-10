/** Temporary extension-storage state used by translation scenarios. */
import { expect, test, type BrowserContext } from '@playwright/test';
import { withExtensionStorageValues } from '../../support/extension-storage';
import { closeOpenMenus, openSettingsMenu } from '../../support/menu-openers';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type ChatSurface } from '../types';

type TranslationDisplayMode = 'below' | 'replace';

export async function withTranslationCleared<T>({
  chat,
  context,
  targetLanguage,
  callback
}: {
  chat: ChatSurface;
  context: BrowserContext;
  targetLanguage: string;
  callback: () => Promise<T>;
}): Promise<T> {
  return withExtensionStorageValues(
    context,
    'sync',
    {
      targetLanguage: '',
      lastTranslationTarget: targetLanguage,
      translationDisplay: 'below'
    },
    async () => {
      await waitForTranslationSettingState(chat, false);
      await waitForTranslationsCleared(chat);
      return callback();
    }
  );
}

export async function withTranslationEnabled<T>({
  chat,
  context,
  targetLanguage,
  translationDisplay,
  callback
}: {
  chat: ChatSurface;
  context: BrowserContext;
  targetLanguage: string;
  translationDisplay: TranslationDisplayMode;
  callback: () => Promise<T>;
}): Promise<T> {
  return withExtensionStorageValues(
    context,
    'sync',
    {
      targetLanguage,
      lastTranslationTarget: targetLanguage,
      translationDisplay
    },
    async () => {
      await waitForTranslationSettingState(chat, true);
      return callback();
    }
  );
}

async function waitForTranslationSettingState(
  chat: ChatSurface,
  enabled: boolean
): Promise<void> {
  await test.step(`Wait for Translate setting to become ${enabled ? 'enabled' : 'disabled'}`, async () => {
    const menu = await openSettingsMenu(chat);
    try {
      const translateItem = menu
        .locator('.ytcq-settings-item[data-ytcq-setting="targetLanguage"]')
        .first();
      // Both translation fields are written together and applied by one storage-change handler.
      await expect(translateItem).toHaveAttribute('aria-checked', String(enabled), {
        timeout: 10_000
      });
    } finally {
      await closeOpenMenus(chat);
    }
  });
}

export async function waitForTranslationsCleared(chat: ChatSurface): Promise<void> {
  await test.step('Wait for previous translation state to clear', async () => {
    await expect(chat.locator('.ytcq-translation')).toHaveCount(0, { timeout: 5_000 });
    await expect(chat.locator('.ytcq-translation-replaced')).toHaveCount(0, { timeout: 5_000 });
    await expect(
      chat.locator(`${NORMAL_CHAT_MESSAGE_SELECTOR}[data-ytcq-translation-key]`)
    ).toHaveCount(0, { timeout: 5_000 });
  });
}

/** Temporary extension-storage state used by translation scenarios. */
import { expect, test, type BrowserContext } from '@playwright/test';
import { withExtensionStorageValues } from '../../support/extension-storage';
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
      await waitForTranslationsCleared(chat);
      return callback();
    }
  );
}

export async function withTranslationEnabled<T>({
  context,
  targetLanguage,
  translationDisplay,
  callback
}: {
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
    callback
  );
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

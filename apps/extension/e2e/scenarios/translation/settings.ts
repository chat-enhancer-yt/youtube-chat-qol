/** Browser scenarios for settings translation behavior. */
import { expect, test, type BrowserContext } from '@playwright/test';
import { openSettingsMenu } from '../../support/menu-openers';
import { withMockedTranslationEndpoint } from '../../support/translation-endpoint';
import type { BrowserScenario, ChatSurface } from '../types';
import {
  expectAnyRenderedTranslation,
  findTranslatableSourceMessage,
  waitForSourceChatMessage
} from './rendering';
import { withTranslationCleared } from './storage';
import { MOCKED_TARGET_LANGUAGE, SETTINGS_TRANSLATED_TEXT } from './test-data';

export const translationSettingsReactScenario: BrowserScenario = async ({ chat, context }) => {
  await waitForSourceChatMessage(chat);
  await expectTranslateSettingReactsLive({ chat, context });
};

async function expectTranslateSettingReactsLive({
  chat,
  context
}: {
  chat: ChatSurface;
  context: BrowserContext;
}): Promise<void> {
  await test.step('Use mocked translation endpoint for chat settings', async () => {
    await withMockedTranslationEndpoint(context, SETTINGS_TRANSLATED_TEXT, async () => {
      await withTranslationCleared({ chat, context, targetLanguage: MOCKED_TARGET_LANGUAGE, callback: async () => {
        const menu = await openSettingsMenu(chat);
        const translateItem = menu.locator('.ytcq-settings-item[data-ytcq-setting="targetLanguage"]').first();
        await findTranslatableSourceMessage(chat);

        await test.step('Enable Translate and verify existing message translates', async () => {
          await expect(translateItem).toHaveAttribute('aria-checked', 'false');
          await translateItem.click();
          await expect(translateItem).toHaveAttribute('aria-checked', 'true');
          await expectAnyRenderedTranslation({
            chat,
            targetLanguage: MOCKED_TARGET_LANGUAGE,
            expectedText: SETTINGS_TRANSLATED_TEXT
          });
        });

        await test.step('Disable Translate and verify visible translation clears', async () => {
          await translateItem.click();
          await expect(translateItem).toHaveAttribute('aria-checked', 'false');
          await expect(chat.locator('.ytcq-translation')).toHaveCount(0, { timeout: 5_000 });
          await expect(chat.locator('.ytcq-translation-replaced')).toHaveCount(0, { timeout: 5_000 });
        });
      } });
    });
  });
}

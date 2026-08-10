/** Browser scenarios for incoming translation behavior. */
import { expect, test, type BrowserContext } from '@playwright/test';
import { withMockedTranslationEndpoint } from '../../support/translation-endpoint';
import {
  NORMAL_CHAT_MESSAGE_SELECTOR,
  type BrowserScenario,
  type ChatSurface
} from '../types';
import {
  expectAnyRenderedTranslation,
  expectToggleableReplacement,
  findTranslatableSourceMessage,
  waitForSourceChatMessage
} from './rendering';
import { withTranslationCleared, withTranslationEnabled } from './storage';
import {
  CONTENT_INSTANCE_ATTRIBUTE,
  MOCKED_TARGET_LANGUAGE,
  MOCKED_TRANSLATED_TEXT,
  TOGGLE_SOURCE_LANGUAGE,
  TOGGLE_TARGET_LANGUAGE,
  TOGGLE_TRANSLATED_TEXT
} from './test-data';

export const mockedMessageTranslationScenario: BrowserScenario = async ({ chat, context }) => {
  await waitForSourceChatMessage(chat);
  await expectMockedIncomingTranslation({ chat, context });
};

export const mockedReplacedTranslationToggleScenario: BrowserScenario = async ({ chat, context }) => {
  await waitForSourceChatMessage(chat);
  await expectMockedReplacedTranslationToggle({ chat, context });
};

async function expectMockedIncomingTranslation({
  chat,
  context
}: {
  chat: ChatSurface;
  context: BrowserContext;
}): Promise<void> {
  await test.step('Use mocked translation endpoint', async () => {
    await withMockedTranslationEndpoint(context, MOCKED_TRANSLATED_TEXT, async () => {
      await enableTranslationAndExpectRendered({
        chat,
        context,
        targetLanguage: MOCKED_TARGET_LANGUAGE,
        expectedText: MOCKED_TRANSLATED_TEXT
      });
    });
  });
}

async function enableTranslationAndExpectRendered({
  chat,
  context,
  targetLanguage,
  expectedText
}: {
  chat: ChatSurface;
  context: BrowserContext;
  targetLanguage: string;
  expectedText?: string;
}): Promise<void> {
  await withTranslationCleared({ chat, context, targetLanguage, callback: async () => {
    await reloadChatForMockedTranslation(chat);
    await findTranslatableSourceMessage(chat);

    await test.step(`Enable translation to ${targetLanguage}`, async () => {
      await withTranslationEnabled({
        chat,
        context,
        targetLanguage,
        translationDisplay: 'below',
        callback: async () => {
          await expectAnyRenderedTranslation({ chat, targetLanguage, expectedText });
        }
      });
    });
  } });
}

async function expectMockedReplacedTranslationToggle({
  chat,
  context
}: {
  chat: ChatSurface;
  context: BrowserContext;
}): Promise<void> {
  await test.step('Use mocked translation endpoint for the real message row', async () => {
    await withMockedTranslationEndpoint(context, TOGGLE_TRANSLATED_TEXT, async () => {
      await withTranslationCleared({ chat, context, targetLanguage: TOGGLE_TARGET_LANGUAGE, callback: async () => {
        await reloadChatForMockedTranslation(chat);
        const { sourceMessage, sourceText } = await findTranslatableSourceMessage(chat);
        await withTranslationEnabled({
          chat,
          context,
          targetLanguage: TOGGLE_TARGET_LANGUAGE,
          translationDisplay: 'replace',
          callback: async () => {
            await expectToggleableReplacement({
              host: sourceMessage,
              originalTitle: /^Translated: Browser translated toggle result(?:\s.*)?$/u,
              sourceText,
              text: sourceMessage.locator('#message').first()
            });
          }
        });
      } });
    }, TOGGLE_SOURCE_LANGUAGE);
  });
}

async function reloadChatForMockedTranslation(chat: ChatSurface): Promise<void> {
  await test.step('Reload chat after disabling translation', async () => {
    const html = chat.locator('html');
    await expect(html).toHaveAttribute(CONTENT_INSTANCE_ATTRIBUTE, /.+/, { timeout: 15_000 });
    const previousInstance = await html.getAttribute(CONTENT_INSTANCE_ATTRIBUTE);
    await chat.locator('body').evaluate(() => {
      window.location.reload();
    });
    await expect.poll(
      () => html.getAttribute(CONTENT_INSTANCE_ATTRIBUTE),
      {
        message: 'Expected the reloaded chat document to claim a new extension instance.',
        timeout: 45_000
      }
    ).not.toBe(previousInstance);
    await expect(chat.locator('yt-live-chat-renderer')).toBeVisible({ timeout: 45_000 });
    await expect(chat.locator(NORMAL_CHAT_MESSAGE_SELECTOR).first()).toBeVisible({
      timeout: 45_000
    });
  });
}

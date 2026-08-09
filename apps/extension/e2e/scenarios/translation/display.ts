/** Browser scenarios for display translation behavior. */
import { expect, test, type BrowserContext, type Locator } from '@playwright/test';
import { requireNativeChatTransport } from '../../support/controlled-chat';
import { closeFocusPromptIfPresent } from '../../support/focus-panel';
import { centerLocatorInViewport } from '../../support/locator';
import type { NativeChatTransport } from '../../support/native-chat-transport';
import { cleanVisibleText } from '../../support/text';
import { withMockedTranslationEndpoint } from '../../support/translation-endpoint';
import {
  NORMAL_CHAT_MESSAGE_SELECTOR,
  type BrowserScenario,
  type ChatSurface
} from '../types';
import {
  escapeCssAttributeValue,
  expectToggleableReplacement,
  findRenderedTranslation,
  waitForSourceChatMessage
} from './rendering';
import { withTranslationCleared, withTranslationEnabled } from './storage';
import {
  DISPLAY_TARGET_LANGUAGE,
  DISPLAY_TRANSLATED_TEXT,
  TOGGLE_SOURCE_LANGUAGE,
  TOGGLE_TARGET_LANGUAGE,
  TOGGLE_TRANSLATED_TEXT
} from './test-data';

export const translationDisplayScenario: BrowserScenario = async ({ chat, context }) => {
  await waitForSourceChatMessage(chat);
  await expectTranslationDisplayModes({ chat, context });
};

export const replacedTranslationToggleSurfacesScenario: BrowserScenario = async ({
  chat,
  context,
  transport
}) => {
  await expectReplacedTranslationToggleSurfaces({
    chat,
    context,
    transport: requireNativeChatTransport(transport)
  });
};

async function expectTranslationDisplayModes({
  chat,
  context
}: {
  chat: ChatSurface;
  context: BrowserContext;
}): Promise<void> {
  await test.step('Use mocked translation endpoint for display modes', async () => {
    await withMockedTranslationEndpoint(context, DISPLAY_TRANSLATED_TEXT, async () => {
      await withTranslationCleared({ chat, context, targetLanguage: DISPLAY_TARGET_LANGUAGE, callback: async () => {
        const { sourceMessage, sourceText } = await expectBelowDisplayMode({
          chat,
          context,
          expectedText: DISPLAY_TRANSLATED_TEXT
        });
        await expectReplaceDisplayMode({
          context,
          sourceMessage,
          sourceText,
          expectedText: DISPLAY_TRANSLATED_TEXT
        });
      } });
    });
  });
}

async function expectBelowDisplayMode({
  chat,
  context,
  expectedText
}: {
  chat: ChatSurface;
  context: BrowserContext;
  expectedText?: string;
}): Promise<{
  sourceMessage: Locator;
  sourceText: string;
}> {
  return test.step('Render translation below the original message', async () => {
    return withTranslationEnabled({
      context,
      targetLanguage: DISPLAY_TARGET_LANGUAGE,
      translationDisplay: 'below',
      callback: async () => {
        const { sourceMessage, sourceText, translation } = await findRenderedTranslation({
          chat,
          targetLanguage: DISPLAY_TARGET_LANGUAGE,
          expectedText
        });
        await expect(sourceMessage.locator('#message')).toContainText(sourceText);
        await expect(sourceMessage).not.toHaveClass(/ytcq-translation-replaced/);
        return { sourceMessage, sourceText, translation };
      }
    });
  });
}

async function expectReplaceDisplayMode({
  context,
  sourceMessage,
  sourceText,
  expectedText
}: {
  context: BrowserContext;
  sourceMessage: Locator;
  sourceText: string;
  expectedText?: string;
}): Promise<void> {
  await test.step('Render translation as a message replacement', async () => {
    await withTranslationEnabled({
      context,
      targetLanguage: DISPLAY_TARGET_LANGUAGE,
      translationDisplay: 'replace',
      callback: async () => {
        const messageText = sourceMessage.locator('#message').first();
        await expect(sourceMessage).toHaveClass(/ytcq-translation-replaced/, { timeout: 20_000 });
        await expect(messageText).toHaveClass(/ytcq-translation-replaced-text/);
        await expect.poll(async () => cleanVisibleText(await messageText.innerText()), {
          message: 'Replacement mode should put the translated text in the original message body.',
          timeout: 5_000
        }).not.toBe(sourceText);
        if (expectedText) {
          await expect(messageText).toContainText(expectedText);
        }
        await expect(messageText).toHaveAttribute('lang', DISPLAY_TARGET_LANGUAGE);
        await expect(messageText).toHaveAttribute('title', /^Original \(.+\): /);
        await expect(sourceMessage.locator('.ytcq-translation')).toHaveCount(0);
      }
    });
  });
}

async function expectReplacedTranslationToggleSurfaces({
  chat,
  context,
  transport
}: {
  chat: ChatSurface;
  context: BrowserContext;
  transport: NativeChatTransport;
}): Promise<void> {
  await test.step('Use mocked translation endpoint for replaced toggle surfaces', async () => {
    await withMockedTranslationEndpoint(context, TOGGLE_TRANSLATED_TEXT, async () => {
      await withTranslationCleared({ chat, context, targetLanguage: TOGGLE_TARGET_LANGUAGE, callback: async () => {
        await withTranslationEnabled({
          context,
          targetLanguage: TOGGLE_TARGET_LANGUAGE,
          translationDisplay: 'replace',
          callback: async () => {
            const source = await deliverTranslatedToggleMessage(chat, transport);
            await expectLiveMessageReplacementToggle(chat, source);
            await expectProfileCardReplacementToggle(chat, source);
            await expectFocusPanelReplacementToggle(chat, source);
          }
        });
      } });
    }, TOGGLE_SOURCE_LANGUAGE);
  });
}

async function deliverTranslatedToggleMessage(
  chat: ChatSurface,
  transport: NativeChatTransport
): Promise<{
  authorName: string;
  messageId: string;
  sourceText: string;
}> {
  return test.step('Deliver a deterministic translatable continuation message', async () => {
    const messageId = await transport.injectMessage({
      author: '@ToggleViewer',
      text: 'Gracias por probar el cambio'
    });
    const source = {
      authorName: '@ToggleViewer',
      messageId,
      sourceText: 'Gracias por probar el cambio'
    };
    await expect(getSourceMessage(chat, source)).toBeVisible({ timeout: 10_000 });
    return source;
  });
}

async function expectLiveMessageReplacementToggle(
  chat: ChatSurface,
  source: {
    messageId: string;
    sourceText: string;
  }
): Promise<void> {
  await test.step('Toggle replaced translation in the chat message row', async () => {
    const sourceMessage = getSourceMessage(chat, source);
    await expectToggleableReplacement({
      host: sourceMessage,
      text: sourceMessage.locator('#message').first(),
      sourceText: source.sourceText
    });
  });
}

async function expectProfileCardReplacementToggle(
  chat: ChatSurface,
  source: {
    messageId: string;
    sourceText: string;
  }
): Promise<void> {
  await test.step('Toggle replaced translation in recent-message profile card', async () => {
    const sourceMessage = getSourceMessage(chat, source);
    await centerLocatorInViewport(sourceMessage);
    await sourceMessage.locator('#author-photo').first().click();

    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await expect(profileCard).toBeVisible({ timeout: 10_000 });

    const record = profileCard.locator(`.ytcq-profile-card-message[data-ytcq-live-message-id="${escapeCssAttributeValue(source.messageId)}"]`).first();
    const text = record.locator('.ytcq-profile-card-message-text').first();
    await expectToggleableReplacement({
      host: record,
      text,
      sourceText: source.sourceText
    });

    await profileCard.locator('.ytcq-profile-card-close').click();
    await expect(profileCard).toHaveCount(0);
  });
}

async function expectFocusPanelReplacementToggle(
  chat: ChatSurface,
  source: {
    authorName: string;
    messageId: string;
    sourceText: string;
  }
): Promise<void> {
  await test.step('Toggle replaced translation in focus panel', async () => {
    const sourceMessage = getSourceMessage(chat, source);
    await centerLocatorInViewport(sourceMessage);
    await sourceMessage.locator('#author-name').first().click();

    const collapsed = chat.locator('.ytcq-focus-card-collapsed');
    await expect(collapsed).toBeVisible({ timeout: 10_000 });
    await collapsed.click();

    const panel = chat.locator('.ytcq-focus-card-expanded');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.locator('.ytcq-focus-author')).toContainText(source.authorName);

    const records = panel.locator('.ytcq-focus-message');
    const record = records.filter({
      hasText: new RegExp(
        `${escapeRegExp(TOGGLE_TRANSLATED_TEXT)}|${escapeRegExp(source.sourceText)}`,
        'u'
      )
    }).first();
    await expect(record).toBeVisible({ timeout: 10_000 });
    const text = record.locator('.ytcq-focus-bubble').first();
    await expectToggleableReplacement({
      host: record,
      text,
      sourceText: source.sourceText
    });

    await closeFocusPromptIfPresent(chat);
  });
}

function getSourceMessage(
  chat: ChatSurface,
  source: {
    messageId: string;
  }
): Locator {
  return chat.locator(`${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssAttributeValue(source.messageId)}"]`).first();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

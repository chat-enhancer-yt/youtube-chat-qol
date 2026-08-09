/** Native composer scenarios whose send request is intercepted before the network. */
import { expect, test } from '@playwright/test';
import { CHAT_INPUT_DRAFTS_STORAGE_KEY } from '../../src/features/chat-drafts/storage';
import { requireNativeChatTransport } from '../support/native-chat-transport';
import {
  appendChatComposerText,
  clearChatComposer,
  getChatComposerInput,
  getChatComposerText,
  setChatComposerText
} from '../support/composer';
import { closeFocusPromptIfPresent } from '../support/focus-panel';
import {
  getExtensionStorageValues,
  withExtensionStorageValues
} from '../support/extension-storage';
import type { NativeChatTransport } from '../support/native-chat-transport';
import { withMockedTranslationEndpoint } from '../support/translation-endpoint';
import type { BrowserScenario } from './types';

const MOCK_TRANSLATED_SEND = 'message traduit puis envoyé localement';

export const interceptedNativeSendScenario: BrowserScenario = async ({ chat, transport }) => {
  const controlledChat = requireNativeChatTransport(transport);
  const text = `Intercepted native send ${Date.now()}`;
  const capturedSend = controlledChat.captureNextSend();

  await test.step('Submit through YouTube’s native composer', async () => {
    await setChatComposerText(chat, text);
    await getChatComposerInput(chat).press('Enter');
  });

  const sent = await test.step('Verify the outbound request was intercepted', async () => {
    const intercepted = await capturedSend;
    expect(intercepted.text).toBe(text);
    return intercepted;
  });

  await test.step('Verify YouTube handles the local success response', async () => {
    await expect.poll(async () => getChatComposerText(chat), {
      message: 'YouTube should clear the composer after the intercepted send succeeds.',
      timeout: 10_000
    }).toBe('');
    const renderer = chat.locator(`#${sent.messageId}`);
    await expect(renderer).toBeVisible({ timeout: 15_000 });
    await expect(renderer.locator('#message')).toContainText(text);
  });
};

export const interceptedTranslatedNativeSendScenario: BrowserScenario = async ({
  chat,
  context,
  transport
}) => {
  const controlledChat = requireNativeChatTransport(transport);
  await withMockedTranslationEndpoint(context, MOCK_TRANSLATED_SEND, async () => {
    await withExtensionStorageValues(context, 'sync', {
      composerTranslateLanguage: 'fr'
    }, async () => {
      await setChatComposerText(chat, 'translate this safely intercepted draft');
      await expect.poll(async () => getChatComposerText(chat), {
        message: 'Composer translation should replace the draft before sending.',
        timeout: 15_000
      }).toContain(MOCK_TRANSLATED_SEND);

      const translatedText = await getChatComposerText(chat);
      await submitComposerAndExpectLocalSuccess(
        chat,
        controlledChat,
        translatedText,
        true
      );
    });
  });
};

export const interceptedSendClearsStoredDraftScenario: BrowserScenario = async ({
  chat,
  context,
  transport
}) => {
  const controlledChat = requireNativeChatTransport(transport);
  const draft = `Stored draft sent locally ${Date.now()}`;
  await withExtensionStorageValues(context, 'local', {
    [CHAT_INPUT_DRAFTS_STORAGE_KEY]: {}
  }, async () => {
    await setChatComposerText(chat, draft);
    await expect.poll(async () => readStoredDrafts(context), {
      message: 'The unsent draft should be saved before submission.',
      timeout: 5_000
    }).toContain(draft);

    await submitComposerAndExpectLocalSuccess(chat, controlledChat, draft);
    await expect.poll(async () => readStoredDrafts(context), {
      message: 'A successfully handled send should clear the stored draft.',
      timeout: 5_000
    }).not.toContain(draft);
  });
};

export const interceptedFocusSendRestoresMentionScenario: BrowserScenario = async ({
  chat,
  transport
}) => {
  const controlledChat = requireNativeChatTransport(transport);
  const author = '@NativeFocusSendViewer';
  const sourceId = await controlledChat.injectMessage({
    author,
    channel: 'UCNativeFocusSendViewer',
    text: 'Open Focus before the safely intercepted send'
  });
  const source = chat.locator(`#${sourceId}`);
  await expect(source).toBeVisible({ timeout: 15_000 });
  await source.locator('#author-name').click();
  await expect(chat.locator('.ytcq-focus-card-collapsed')).toBeVisible({ timeout: 10_000 });
  await chat.locator('.ytcq-focus-card-collapsed').click();
  await expect(chat.locator('.ytcq-focus-card-expanded')).toBeVisible({ timeout: 10_000 });

  await expect.poll(async () => (await getChatComposerText(chat)).replaceAll('\u00a0', ' '), {
    message: 'Focus should place its fixed mention in the native composer.',
    timeout: 5_000
  }).toBe(`${author} `);

  const reply = 'safely intercepted Focus reply';
  const text = `${author} ${reply}`;
  await appendChatComposerText(chat, reply);
  await submitComposerAndExpectLocalSuccess(chat, controlledChat, text, false);
  await expect.poll(async () => (await getChatComposerText(chat)).replaceAll('\u00a0', ' '), {
    message: 'Focus should restore its fixed mention after YouTube handles the send.',
    timeout: 5_000
  }).toBe(`${author} `);

  await closeFocusPromptIfPresent(chat);
  await clearChatComposer(chat);
};

async function submitComposerAndExpectLocalSuccess(
  chat: Parameters<typeof getChatComposerText>[0],
  transport: NativeChatTransport,
  expectedText: string,
  expectEmptyComposer = true
): Promise<void> {
  const capturedSend = transport.captureNextSend();
  await getChatComposerInput(chat).press('Enter');
  const sent = await capturedSend;
  expect(sent.text).toBe(expectedText);

  if (expectEmptyComposer) {
    await expect.poll(async () => getChatComposerText(chat), {
      message: 'YouTube should clear the composer after the intercepted send succeeds.',
      timeout: 10_000
    }).toBe('');
  }
}

async function readStoredDrafts(
  context: Parameters<typeof getExtensionStorageValues>[0]
): Promise<string> {
  const stored = await getExtensionStorageValues(context, 'local', [
    CHAT_INPUT_DRAFTS_STORAGE_KEY
  ]);
  return JSON.stringify(stored[CHAT_INPUT_DRAFTS_STORAGE_KEY] || {});
}

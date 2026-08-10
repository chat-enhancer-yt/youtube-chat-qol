/** Browser scenarios for profile card behavior. */
import { expect, test, type Locator } from '@playwright/test';
import { requireControlledChat } from '../../support/controlled-chat';
import { centerLocatorInViewport } from '../../support/locator';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type BrowserScenario } from '../types';
import {
  deliverAuthorMessageAndVerifyProfileCardUpdates,
  expectProfileAvatarRingToggle,
  expectProfileCardHasRecentMessages,
  expectProfileCardJumpToMessage,
  expectProfileChannelButtonOpensChannel
} from './card-assertions';
import {
  closeProfileCard,
  escapeCssString,
  openStableProfileCardFromRecentMessage
} from './card-fixture';

export const profileCardRecentMessagesScenario: BrowserScenario = async ({ chat, context }) => {
  const source = await openStableProfileCardFromRecentMessage(chat);
  await expectProfileCardHasRecentMessages(chat, source);
  await expectProfileCardJumpToMessage(chat, source);
  await expectProfileAvatarRingToggle(chat, source);
  await expectProfileChannelButtonOpensChannel(chat, context);
  await closeProfileCard(chat);
};

export const profileCardReceivesNewMessagesScenario: BrowserScenario = async ({
  chat,
  controlledChat
}) => {
  const incoming = requireControlledChat(controlledChat);
  const channelId = 'UCParityProfileViewer';
  await incoming.injectMessage({
    author: '@ParityProfileViewer',
    channel: channelId,
    text: 'Controlled profile source message'
  });
  const source = await openStableProfileCardFromRecentMessage(chat);
  source.channelId = channelId;
  await expectProfileCardHasRecentMessages(chat, source);
  await deliverAuthorMessageAndVerifyProfileCardUpdates(chat, incoming, source);
  await closeProfileCard(chat);
};

export const profileCardHistoryPagingScenario: BrowserScenario = async ({
  chat,
  controlledChat
}) => {
  await test.step('Page through retained profile history around an older feed message', async () => {
    const incoming = requireControlledChat(controlledChat);

    const author = '@ProfileHistoryViewer';
    const channel = 'profile-history-channel';
    const messages = Array.from({ length: 30 }, (_value, index) => ({
      author,
      channel,
      text: `Profile history ${index}`
    }));
    const { deliveredIds: messageIds } = await incoming.injectMessages(messages);
    expect(messageIds).toHaveLength(30);

    const originMessageId = messageIds[15];
    const originMessage = chat.locator(
      `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(originMessageId)}"]`
    );
    await centerLocatorInViewport(originMessage);
    await originMessage.locator('#author-photo').click();

    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    const list = profileCard.locator('.ytcq-profile-card-messages');
    const records = list.locator('.ytcq-profile-card-message');
    const originRecord = records.filter({ hasText: 'Profile history 15' });
    await expect(records).toHaveCount(12);
    await expect(originRecord).toHaveClass(/ytcq-profile-card-message-origin/);
    await expect(originRecord).toBeVisible();

    await pageProfileHistoryToEdge(list, records, 'start', 21);
    await expect(records.first()).toContainText('Profile history 0');

    await pageProfileHistoryToEdge(list, records, 'end', 30);
    await expect(records.last()).toContainText('Profile history 29');

    await closeProfileCard(chat);
  });
};

async function pageProfileHistoryToEdge(
  list: Locator,
  records: Locator,
  edge: 'end' | 'start',
  expectedCount: number
): Promise<void> {
  await expect.poll(async () => {
    await list.evaluate((element, targetEdge) => {
      element.scrollTop = targetEdge === 'start' ? 0 : element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
    }, edge);
    await list.evaluate(
      () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    );
    return records.count();
  }, {
    message: `Expected profile history to page toward the ${edge}.`,
    timeout: 15_000
  }).toBe(expectedCount);
}

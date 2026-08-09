/** Browser scenarios for profile card behavior. */
import { expect, test } from '@playwright/test';
import { appendMockFixtureMessage, isMockPageSurface } from '../../support/mock-page';
import { centerLocatorInViewport } from '../../support/locator';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type BrowserScenario } from '../types';
import {
  appendAuthorMessageAndVerifyProfileCardUpdates,
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

export const profileCardReceivesNewMessagesScenario: BrowserScenario = async ({ chat }) => {
  const source = await openStableProfileCardFromRecentMessage(chat);
  await expectProfileCardHasRecentMessages(chat, source);
  await appendAuthorMessageAndVerifyProfileCardUpdates(chat, source);
  await closeProfileCard(chat);
};

export const profileCardHistoryPagingScenario: BrowserScenario = async ({ chat }) => {
  await test.step('Page through retained profile history around an older feed message', async () => {
    if (!isMockPageSurface(chat)) {
      throw new Error('Profile history paging requires the deterministic mock chat page.');
    }

    const author = '@ProfileHistoryViewer';
    const channel = 'profile-history-channel';
    const messageIds: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const messageId = await appendMockFixtureMessage(chat, {
        author,
        channel,
        text: `Profile history ${index}`
      });
      if (messageId) messageIds.push(messageId);
    }
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

    await list.evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(records).toHaveCount(21);
    await expect(records.first()).toContainText('Profile history 0');
    await list.evaluate(
      () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    );

    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(records).toHaveCount(30);
    await expect(records.last()).toContainText('Profile history 29');

    await closeProfileCard(chat);
  });
};

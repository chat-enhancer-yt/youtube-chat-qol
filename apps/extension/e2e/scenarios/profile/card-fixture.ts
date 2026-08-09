/** Stable profile-card source-message and card lookup fixtures. */
import { expect, test, type Locator } from '@playwright/test';
import { centerLocatorInViewport } from '../../support/locator';
import { cleanVisibleText, getRichVisibleText } from '../../support/text';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type ChatSurface } from '../types';

export interface ProfileMessageSource {
  authorName: string;
  channelId: string;
  messageId: string;
  messageText: string;
  targetId: string;
}

const PROFILE_TARGET_ATTRIBUTE = 'data-ytcq-e2e-profile-target';
let nextProfileTargetId = 0;

export async function openStableProfileCardFromRecentMessage(
  chat: ChatSurface
): Promise<ProfileMessageSource> {
  return test.step('Open recent-message profile card from a stable avatar', async () => {
    const messages = chat.locator(NORMAL_CHAT_MESSAGE_SELECTOR);
    await messages.last().waitFor({ state: 'visible', timeout: 45_000 });

    const count = await messages.count();
    const firstCandidate = Math.max(0, count - 20);
    for (let index = count - 1; index >= firstCandidate; index -= 1) {
      const targetId = await freezeProfileMessageTarget(messages.nth(index)).catch(() => '');
      if (!targetId) continue;
      const sourceMessage = chat
        .locator(`[${PROFILE_TARGET_ATTRIBUTE}="${escapeCssString(targetId)}"]`)
        .first();
      await centerLocatorInViewport(sourceMessage);

      const sourceBeforeClick = await readProfileMessageSource(sourceMessage, targetId);
      if (!sourceBeforeClick) continue;

      const avatar = sourceMessage.locator('#author-photo').first();
      if (!(await avatar.isVisible({ timeout: 500 }).catch(() => false))) continue;

      await avatar.click({ timeout: 2_000 }).catch(() => undefined);
      const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
      if (!(await profileCard.isVisible({ timeout: 5_000 }).catch(() => false))) continue;

      const sourceAfterClick = await readProfileMessageSource(sourceMessage, targetId);
      const cardAuthor = cleanVisibleText(
        await profileCard
          .locator('.ytcq-profile-card-title')
          .innerText()
          .catch(() => '')
      );
      if (
        sourceAfterClick &&
        cardAuthor === sourceAfterClick.authorName &&
        isSameProfileMessageSource(sourceBeforeClick, sourceAfterClick)
      ) {
        return sourceAfterClick;
      }

      await closeProfileCardIfPresent(chat);
    }

    throw new Error('Could not open a profile card from a stable recent message.');
  });
}

async function readProfileMessageSource(
  message: Locator,
  targetId: string
): Promise<ProfileMessageSource | null> {
  const authorName = cleanVisibleText(
    await message
      .locator('#author-name')
      .first()
      .innerText()
      .catch(() => '')
  );
  const messageText = await getRichVisibleText(message.locator('#message').first()).catch(() => '');
  if (!authorName || !messageText || !hasMeaningfulText(messageText)) return null;

  const channelId = await message
    .evaluate((element) => {
      const author = element.querySelector('#author-name');
      const link = author?.closest('a[href]') || element.querySelector('a[href*="/channel/"]');
      const href = link?.getAttribute('href') || '';
      try {
        const url = new URL(href, 'https://www.youtube.com');
        const [kind, id] = url.pathname.split('/').filter(Boolean);
        return kind === 'channel' ? id : '';
      } catch {
        return '';
      }
    })
    .catch(() => '');
  const messageId = (await message.getAttribute('id').catch(() => '')) || '';

  return {
    authorName,
    channelId,
    messageId,
    messageText,
    targetId
  };
}

async function freezeProfileMessageTarget(message: Locator): Promise<string> {
  const targetId = `profile-card-${Date.now()}-${nextProfileTargetId++}`;
  const didFreeze = await message.evaluate(
    (element, { attribute, value }) => {
      if (!(element instanceof HTMLElement) || !element.isConnected) return false;
      element.setAttribute(attribute, value);
      return true;
    },
    {
      attribute: PROFILE_TARGET_ATTRIBUTE,
      value: targetId
    }
  );

  if (!didFreeze)
    throw new Error('Could not stabilize the live chat profile target before clicking it.');
  return targetId;
}

function isSameProfileMessageSource(
  first: ProfileMessageSource,
  second: ProfileMessageSource
): boolean {
  const messageIdMatches =
    !first.messageId || !second.messageId || first.messageId === second.messageId;
  return (
    messageIdMatches &&
    first.authorName === second.authorName &&
    first.channelId === second.channelId &&
    first.messageText === second.messageText &&
    first.targetId === second.targetId
  );
}

export async function getProfileCardRecord(
  chat: ChatSurface,
  source: ProfileMessageSource
): Promise<Locator> {
  if (source.messageId) {
    const liveMessageRecord = chat
      .locator(
        `.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message[data-ytcq-live-message-id="${escapeCssString(source.messageId)}"]`
      )
      .first();
    if (await liveMessageRecord.count()) return liveMessageRecord;
  }

  const records = chat.locator(
    '.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message'
  );

  await expect
    .poll(async () => findProfileCardRecordIndex(records, source.messageText), {
      message: 'Profile card should contain the exact recent message record.',
      timeout: 10_000
    })
    .toBeGreaterThanOrEqual(0);

  const index = await findProfileCardRecordIndex(records, source.messageText);
  return records.nth(index);
}

async function findProfileCardRecordIndex(records: Locator, expectedText: string): Promise<number> {
  const count = await records.count();

  for (let index = 0; index < count; index += 1) {
    const text = await getRichVisibleText(
      records.nth(index).locator('.ytcq-profile-card-message-text').first(),
      {
        ignoredSelector: '.ytcq-translation, .ytcq-replaced-translation-icon'
      }
    ).catch(() => '');
    if (text === expectedText) return index;
  }

  return -1;
}

export async function closeProfileCard(chat: ChatSurface): Promise<void> {
  await test.step('Close profile card', async () => {
    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await profileCard.locator('.ytcq-profile-card-close').click();
    await expect(profileCard).toHaveCount(0);
  });
}

export async function closeProfileCardIfPresent(chat: ChatSurface): Promise<void> {
  const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
  if (!(await profileCard.isVisible({ timeout: 500 }).catch(() => false))) return;

  await profileCard
    .locator('.ytcq-profile-card-close')
    .click()
    .catch(() => undefined);
  await expect(profileCard)
    .toHaveCount(0, { timeout: 2_000 })
    .catch(() => undefined);
}

export function getProfileSourceMessage(
  chat: ChatSurface,
  source: ProfileMessageSource
): ReturnType<ChatSurface['locator']> {
  if (source.messageId) {
    return chat
      .locator(`${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(source.messageId)}"]`)
      .first();
  }

  if (source.targetId) {
    return chat
      .locator(`[${PROFILE_TARGET_ATTRIBUTE}="${escapeCssString(source.targetId)}"]`)
      .first();
  }

  return chat
    .locator(NORMAL_CHAT_MESSAGE_SELECTOR)
    .filter({
      has: chat.locator('#author-name').filter({ hasText: source.authorName })
    })
    .filter({
      has: chat.locator('#message').filter({ hasText: source.messageText })
    })
    .last();
}

function hasMeaningfulText(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

export function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

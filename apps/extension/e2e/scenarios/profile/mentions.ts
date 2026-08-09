/** Browser scenarios for profile mentions behavior. */
import { expect, test } from '@playwright/test';
import { requireControlledChat } from '../../support/controlled-chat';
import { NORMAL_CHAT_MESSAGE_SELECTOR, type BrowserScenario } from '../types';
import { expectProfileCardPositionedFromAnchor } from './card-assertions';
import { closeProfileCard, escapeCssString } from './card-fixture';

export const profileMentionOpensRecentMessagesScenario: BrowserScenario = async ({
  chat,
  controlledChat
}) => {
  await test.step('Open mentioned-user history from an inline handle', async () => {
    const incoming = requireControlledChat(controlledChat);

    const mentionedAuthor = '@MentionedProfileViewer';
    const mentionText = mentionedAuthor.toLowerCase();
    const mentionedChannel = 'UCMentionedProfileViewer';
    const nestedAuthor = '@NestedProfileViewer';
    const nestedMentionText = nestedAuthor.toLowerCase();
    const nestedHistoryText = `Nested profile history ${Date.now()}`;
    const historyText = `Please ask ${nestedMentionText} next`;
    await incoming.injectMessage({
      author: nestedAuthor,
      channel: 'UCNestedProfileViewer',
      text: nestedHistoryText
    });
    await incoming.injectMessage({
      author: mentionedAuthor,
      channel: mentionedChannel,
      text: historyText
    });
    const mentionMessageId = await incoming.injectMessage({
      author: '@MentioningProfileViewer',
      channel: 'UCMentioningProfileViewer',
      text: `Please ask ${mentionText}, not @mentionedprofile or @NoMatchingProfileViewer`
    });

    const mentionMessage = chat.locator(
      `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(mentionMessageId)}"]`
    );
    const mention = mentionMessage.locator('.ytcq-profile-mention').filter({
      hasText: mentionText
    });
    await expect(mention).toBeVisible();
    await expect(mention).toHaveAttribute('role', 'button');
    await expect(mentionMessage.locator('.ytcq-profile-mention')).toHaveCount(1);
    await mention.click();

    const profileCard = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    await expect(profileCard.locator('.ytcq-profile-card-title')).toHaveText(mentionedAuthor);
    await expect(
      profileCard.locator('.ytcq-profile-card-message').filter({ hasText: historyText })
    ).toBeVisible();

    const nestedMention = profileCard.locator('.ytcq-profile-mention').filter({
      hasText: nestedMentionText
    });
    await expect(nestedMention).toBeVisible();
    await chat.locator('html').evaluate(() => {
      const testWindow = window as typeof window & {
        ytcqBrowserProfileMentionRect?: { left: number; right: number; top: number };
      };
      delete testWindow.ytcqBrowserProfileMentionRect;
      window.addEventListener(
        'click',
        (event) => {
          const target = event.target instanceof Element ? event.target : null;
          const mention = target?.closest<HTMLElement>(
            '.ytcq-profile-card .ytcq-profile-mention'
          );
          if (!mention) return;

          const rect = mention.getBoundingClientRect();
          testWindow.ytcqBrowserProfileMentionRect = {
            left: rect.left,
            right: rect.right,
            top: rect.top
          };
        },
        { capture: true, once: true }
      );
    });
    await nestedMention.click();
    const nestedMentionRect = await chat.locator('html').evaluate(() => {
      const testWindow = window as typeof window & {
        ytcqBrowserProfileMentionRect?: { left: number; right: number; top: number };
      };
      const rect = testWindow.ytcqBrowserProfileMentionRect || null;
      delete testWindow.ytcqBrowserProfileMentionRect;
      return rect;
    });
    expect(nestedMentionRect).not.toBeNull();

    await expect(profileCard.locator('.ytcq-profile-card-title')).toHaveText(nestedAuthor);
    await expect(
      profileCard.locator('.ytcq-profile-card-message').filter({ hasText: nestedHistoryText })
    ).toBeVisible();
    await expectProfileCardPositionedFromAnchor(profileCard, nestedMentionRect!);
    await closeProfileCard(chat);
  });
};

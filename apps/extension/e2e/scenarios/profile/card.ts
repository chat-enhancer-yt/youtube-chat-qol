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

export const profileCardResizeScenario: BrowserScenario = async ({
  chat,
  controlledChat,
  page
}) => {
  await test.step('Resize a profile card without stretching sparse message rows', async () => {
    const incoming = requireControlledChat(controlledChat);
    const author = '@ResizableProfileViewer';
    const channel = 'resizable-profile-channel';
    const { deliveredIds } = await incoming.injectMessages(
      Array.from({ length: 3 }, (_value, index) => ({
        author,
        channel,
        text: `Resizable profile message ${index + 1}`
      }))
    );
    const sourceMessage = chat.locator(
      `${NORMAL_CHAT_MESSAGE_SELECTOR}[id="${escapeCssString(deliveredIds.at(-1) || '')}"]`
    );
    await centerLocatorInViewport(sourceMessage);
    await sourceMessage.locator('#author-photo').click();

    const card = chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)');
    const rows = card.locator('.ytcq-profile-card-message');
    await expect(rows).toHaveCount(3);
    await card.evaluate((panel) => {
      Object.assign((panel as HTMLElement).style, {
        bottom: 'auto',
        left: '20px',
        right: 'auto',
        top: '20px',
        transform: ''
      });
    });

    const original = await measureResizableProfileCard(card);
    const grip = card.locator('.ytcq-panel-drag-grip');
    expect(await grip.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return [rect.left + 4, rect.left + rect.width / 2, rect.right - 4].every(
        (x) => document.elementFromPoint(x, rect.bottom - 1) === element
      );
    })).toBe(true);

    const gripBox = await grip.boundingBox();
    if (!gripBox) throw new Error('Profile drag grip is not visible.');
    await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(gripBox.x + gripBox.width / 2 + 30, gripBox.y + gripBox.height / 2 + 20);
    await page.mouse.up();
    const dragged = await measureResizableProfileCard(card);
    expect(dragged.left).toBeCloseTo(original.left + 30, 0);
    expect(dragged.top).toBeCloseTo(original.top + 20, 0);

    const topResizeHandle = card.locator('.ytcq-panel-resize-handle-top');
    const topResizeHandleBox = await topResizeHandle.boundingBox();
    if (!topResizeHandleBox) throw new Error('Profile top resize handle is not visible.');
    await page.mouse.move(topResizeHandleBox.x + 16, topResizeHandleBox.y + 12);
    await page.mouse.down();
    await page.mouse.move(topResizeHandleBox.x + 16, topResizeHandleBox.y - 8);
    await page.mouse.up();
    const topResized = await measureResizableProfileCard(card);
    expect(topResized.height).toBeCloseTo(dragged.height + 20, 0);
    expect(topResized.top).toBeCloseTo(dragged.top - 20, 0);

    await card.evaluate((panel) => {
      const element = panel as HTMLElement;
      element.style.left = '20px';
      element.style.top = '0px';
    });
    const reset = await measureResizableProfileCard(card);
    const frameOrigin = await getFrameOrigin(card, reset.left, reset.top);
    const resizeHandle = card.locator('.ytcq-panel-resize-handle-bottom-right');
    expect(await resizeHandle.evaluate((element) => {
      const panelRect = element.parentElement!.getBoundingClientRect();
      return document.elementFromPoint(panelRect.right + 4, panelRect.bottom + 4) === element;
    })).toBe(true);
    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) throw new Error('Profile resize handle is not visible.');
    await page.mouse.move(handleBox.x + 4, handleBox.y + 4);
    await page.mouse.down();
    await page.mouse.move(
      frameOrigin.x + reset.viewportWidth - 2,
      frameOrigin.y + reset.viewportHeight - 2
    );
    await page.mouse.up();

    const expanded = await measureResizableProfileCard(card);
    expect(expanded.height).toBeGreaterThan(original.height + 20);
    expect(expanded.height).toBeCloseTo(expanded.viewportHeight, 0);
    expect(Math.max(...expanded.rowHeights)).toBeLessThanOrEqual(
      Math.max(...original.rowHeights) + 2
    );

    const expandedHandleBox = await resizeHandle.boundingBox();
    if (!expandedHandleBox) throw new Error('Expanded profile resize handle is not visible.');
    await page.mouse.move(
      expandedHandleBox.x + expandedHandleBox.width / 2,
      expandedHandleBox.y + expandedHandleBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(frameOrigin.x, frameOrigin.y);
    await page.mouse.up();

    const restored = await measureResizableProfileCard(card);
    expect(restored.width).toBeCloseTo(original.width, 0);
    expect(restored.height).toBeCloseTo(140, 0);
    expect(restored.height).toBeLessThan(original.height);
    await closeProfileCard(chat);
  });
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

async function measureResizableProfileCard(card: Locator): Promise<{
  height: number;
  left: number;
  rowHeights: number[];
  top: number;
  viewportHeight: number;
  viewportWidth: number;
  width: number;
}> {
  return card.evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return {
      height: rect.height,
      left: rect.left,
      rowHeights: Array.from(panel.querySelectorAll('.ytcq-profile-card-message')).map(
        (row) => row.getBoundingClientRect().height
      ),
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      width: rect.width
    };
  });
}

async function getFrameOrigin(
  card: Locator,
  clientLeft: number,
  clientTop: number
): Promise<{ x: number; y: number }> {
  const box = await card.boundingBox();
  if (!box) throw new Error('Profile card is not visible.');
  return {
    x: box.x - clientLeft,
    y: box.y - clientTop
  };
}

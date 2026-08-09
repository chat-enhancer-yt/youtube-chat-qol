/**
 * Native YouTube performance coverage for live-updating extension panels.
 *
 * Focus mode, recent-message cards, and the Inbox all listen for new messages.
 * This test keeps those surfaces open during a burst so panel updates,
 * translation rendering, and keyword records are stressed together.
 */
import { expect } from '@playwright/test';
import { nativeYouTubePerformanceTest as test } from '../../support/fixtures/youtube-native-performance';
import { withExtensionStorageValues } from '../../support/extension-storage';
import type { FrameLocator } from '@playwright/test';
import {
  createPerformanceReport,
  formatMb,
  formatMs,
  formatNullableMb,
  getHeapGrowthMb,
  getPositiveIntegerEnv,
  withMockedPerformanceTranslationEndpoint,
  writePerformanceReport,
  type BrowserPerfProbeSnapshot
} from '../../support/performance';
import {
  collectNativeChatHeapSnapshot,
  startNativeChatPerfProbe,
  stopNativeChatPerfProbe
} from '../../support/native-performance';
import type { NativeChatTransport } from '../../support/native-chat-transport';

const FOCUS_INBOX_MESSAGE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_PANEL_MESSAGE_COUNT', 60);
const PROFILE_MESSAGE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_PROFILE_PANEL_MESSAGE_COUNT', 30);
const TOTAL_MESSAGE_COUNT = FOCUS_INBOX_MESSAGE_COUNT + PROFILE_MESSAGE_COUNT;
const CONTROLLED_TEXT_PREFIX = 'YTCQ open panels';
const TARGET_LANGUAGE = 'cy';
const PANEL_KEYWORD = 'panelwatch';

const BUDGETS = {
  continuationIngressMs: 2_500,
  heapGrowthMb: 80,
  maxLongTaskMs: 300,
  panelUpdateMs: 5_000,
  p95FrameGapMs: 350
};

interface SourceAuthor {
  author: string;
  channel: string;
  messageId: string;
}

test('youtube-native performance: open panels keep up with incoming messages', async ({
  nativePerformanceSession
}, testInfo) => {
  const { context, openChat, page, transport } = nativePerformanceSession;
  await withMockedPerformanceTranslationEndpoint(context, {
    countText: (text) => text.startsWith(CONTROLLED_TEXT_PREFIX),
    delayMs: 8,
    translatedText: 'YTCQ panel translation'
  }, async (translationStats) => {
    await withExtensionStorageValues(context, 'sync', {
      lastTranslationTarget: TARGET_LANGUAGE,
      sound: false,
      targetLanguage: TARGET_LANGUAGE,
      translationDisplay: 'below'
    }, async () => {
      await withExtensionStorageValues(context, 'local', {
        ytcqInboxKeywords: [PANEL_KEYWORD]
      }, async () => {
        const chat = await openChat();
        const source = await createSourceAuthor(chat, transport);
        await openProfileCard(chat, source.messageId);

        const heapBefore = await collectNativeChatHeapSnapshot(context, page);
        await startNativeChatPerfProbe(chat);
        const profileMessages = createPanelMessages(source, PROFILE_MESSAGE_COUNT, 'profile');
        const profileLastText = profileMessages.at(-1)?.text || '';
        const profileDelivery = await transport.injectMessages(profileMessages);
        const profileUpdateMs = await waitForProfilePanelToReceiveMessage(chat, profileLastText);
        await closeProfileCard(chat);

        await openFocusPanel(chat, source.messageId);
        await openInboxPanel(chat);
        const focusInboxMessages = createPanelMessages(source, FOCUS_INBOX_MESSAGE_COUNT, 'focus-inbox');
        const focusInboxLastText = focusInboxMessages.at(-1)?.text || '';
        const focusInboxDelivery = await transport.injectMessages(focusInboxMessages);
        const focusInboxUpdateMs = await waitForFocusAndInboxToReceiveMessage(chat, focusInboxLastText);
        const continuationIngressMs = profileDelivery.durationMs + focusInboxDelivery.durationMs;
        const panelUpdateMs = profileUpdateMs + focusInboxUpdateMs;
        const panelTranslationCount = await chat.locator([
          '.ytcq-focus-card-expanded .ytcq-translation',
          '.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-translation',
          '.ytcq-inbox-card .ytcq-translation'
        ].join(',')).count();
        const probe = await stopNativeChatPerfProbe(chat);
        const heapAfter = await collectNativeChatHeapSnapshot(context, page);
        const heapGrowthMb = getHeapGrowthMb(heapBefore, heapAfter);

        const report = createPerformanceReport(
          'youtube-native open Focus/Profile/Inbox panels during fast chat',
          [
            { label: 'Controlled messages', value: TOTAL_MESSAGE_COUNT },
            { label: 'Continuation ingress', value: formatMs(continuationIngressMs), budget: formatMs(BUDGETS.continuationIngressMs) },
            { label: 'Profile update', value: formatMs(profileUpdateMs), budget: formatMs(BUDGETS.panelUpdateMs) },
            { label: 'Focus/Inbox update', value: formatMs(focusInboxUpdateMs), budget: formatMs(BUDGETS.panelUpdateMs) },
            { label: 'Combined panel update', value: formatMs(panelUpdateMs) },
            { label: 'Translation requests', value: translationStats.requestCount },
            { label: 'Panel translations', value: panelTranslationCount },
            { label: 'Long tasks', value: probe.longTaskCount },
            { label: 'Max long task', value: formatMs(probe.maxLongTaskMs), budget: formatMs(BUDGETS.maxLongTaskMs) },
            { label: 'p95 frame gap', value: formatMs(probe.p95FrameGapMs), budget: formatMs(BUDGETS.p95FrameGapMs) },
            { label: 'Max frame gap', value: formatMs(probe.maxFrameGapMs) },
            { label: 'Heap growth', value: formatNullableMb(heapGrowthMb), budget: formatMb(BUDGETS.heapGrowthMb) }
          ]
        );

        await writePerformanceReport(testInfo, 'youtube-native-open-panels', report);
        assertPerformanceBudgets({
          continuationIngressMs,
          heapGrowthMb,
          panelUpdateMs,
          panelTranslationCount,
          probe
        });
      });
    });
  });
});

async function createSourceAuthor(
  chat: FrameLocator,
  transport: NativeChatTransport
): Promise<SourceAuthor> {
  const author = '@NativePanelPerfViewer';
  const channel = 'UCNativePanelPerfViewer';
  const text = 'Native panel performance source';
  const messageId = await transport.injectMessage({ author, channel, text });
  await expect(chat.locator(`#${messageId}`)).toBeVisible({ timeout: 15_000 });
  return { author, channel, messageId };
}

async function openProfileCard(chat: FrameLocator, messageId: string): Promise<void> {
  const sourceMessage = chat.locator(`#${messageId}`);
  await sourceMessage.locator('#author-photo').click();
  await expect(chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)')).toBeVisible({ timeout: 10_000 });
}

async function openFocusPanel(chat: FrameLocator, messageId: string): Promise<void> {
  const sourceMessage = chat.locator(`#${messageId}`);
  await sourceMessage.locator('#author-name').click();
  await chat.locator('.ytcq-focus-card-collapsed').click();
  await expect(chat.locator('.ytcq-focus-card-expanded')).toBeVisible({ timeout: 10_000 });
}

async function openInboxPanel(chat: FrameLocator): Promise<void> {
  await chat.locator('.ytcq-inbox-button').click();
  await expect(chat.locator('.ytcq-inbox-card')).toBeVisible({ timeout: 10_000 });
}

async function closeProfileCard(chat: FrameLocator): Promise<void> {
  await chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-close').click();
  await expect(chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card)')).toHaveCount(0);
}

function createPanelMessages(source: SourceAuthor, count: number, label: string) {
  return Array.from({ length: count }, (_, index) => ({
    author: source.author,
    channel: source.channel,
    text: `${CONTROLLED_TEXT_PREFIX} ${PANEL_KEYWORD} ${label} message ${index} gracias por mirar`
  }));
}

async function waitForProfilePanelToReceiveMessage(chat: FrameLocator, lastText: string): Promise<number> {
  const startedAt = performance.now();
  await expect(chat.locator('.ytcq-profile-card:not(.ytcq-inbox-card) .ytcq-profile-card-message').filter({ hasText: lastText }).first())
    .toBeVisible({ timeout: BUDGETS.panelUpdateMs });
  return performance.now() - startedAt;
}

async function waitForFocusAndInboxToReceiveMessage(chat: FrameLocator, lastText: string): Promise<number> {
  const startedAt = performance.now();
  await expect(chat.locator('.ytcq-focus-card-expanded .ytcq-focus-bubble').filter({ hasText: lastText }).first())
    .toBeVisible({ timeout: BUDGETS.panelUpdateMs });
  await expect(chat.locator('.ytcq-inbox-card .ytcq-inbox-message').filter({ hasText: lastText }).first())
    .toBeVisible({ timeout: BUDGETS.panelUpdateMs });
  return performance.now() - startedAt;
}

function assertPerformanceBudgets({
  continuationIngressMs,
  heapGrowthMb,
  panelTranslationCount,
  panelUpdateMs,
  probe
}: {
  continuationIngressMs: number;
  heapGrowthMb: number | null;
  panelTranslationCount: number;
  panelUpdateMs: number;
  probe: BrowserPerfProbeSnapshot;
}): void {
  expect.soft(continuationIngressMs, 'YouTube should consume panel continuations promptly.')
    .toBeLessThanOrEqual(BUDGETS.continuationIngressMs);
  expect.soft(panelUpdateMs, 'Open panels should receive the latest message within budget.')
    .toBeLessThanOrEqual(BUDGETS.panelUpdateMs);
  expect.soft(panelTranslationCount, 'Open panels should receive prioritized translations.')
    .toBeGreaterThan(0);
  expect.soft(probe.maxLongTaskMs, 'Panel updates should not create a catastrophic long task.')
    .toBeLessThanOrEqual(BUDGETS.maxLongTaskMs);
  expect.soft(probe.p95FrameGapMs, 'The page should keep painting with panels open.')
    .toBeLessThanOrEqual(BUDGETS.p95FrameGapMs);

  if (heapGrowthMb !== null) {
    expect.soft(heapGrowthMb, 'Open panel heap growth should stay bounded.')
      .toBeLessThanOrEqual(BUDGETS.heapGrowthMb);
  }
}

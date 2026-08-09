/**
 * Native YouTube performance coverage for high-volume chat.
 *
 * This test keeps the provider mocked and drives the fixture through the same
 * native continuation path as normal chat messages. It catches catastrophic
 * queue, observer, and rendering regressions without sending chat messages or
 * depending on the real Google Translate endpoint.
 */
import { expect, type FrameLocator } from '@playwright/test';
import { nativeYouTubePerformanceTest as test } from '../../support/fixtures/youtube-native-performance';
import { withExtensionStorageValues } from '../../support/extension-storage';
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

const MESSAGE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_MESSAGE_COUNT', 180);
const EXPECTED_TRANSLATION_ITEM_FLOOR = Math.floor(MESSAGE_COUNT * 0.99);
const VISIBLE_MESSAGE_FLOOR = Math.min(MESSAGE_COUNT, 100);
const CONTROLLED_TEXT_PREFIX = 'YTCQ fast chat';
const CONTROLLED_RENDERER_SELECTOR = 'yt-live-chat-text-message-renderer[id^="ytcq-native-message-"]';
const TARGET_LANGUAGE = 'cy';
const PERF_KEYWORDS = ['launch', 'priority', 'stream'];
const TRANSLATION_RESPONSE_DELAY_MS = 8;

const BUDGETS = {
  continuationIngressMs: 1_500,
  heapGrowthMb: 80,
  maxLongTaskMs: 750,
  p95FrameGapMs: 300,
  translationDrainMs: 10_000
};

test('youtube-native performance: fast chat stays responsive with translation and inbox matching', async ({
  nativePerformanceSession
}, testInfo) => {
  const { context, openChat, page, transport } = nativePerformanceSession;
  await withMockedPerformanceTranslationEndpoint(context, {
    countText: (text) => text.startsWith(CONTROLLED_TEXT_PREFIX),
    delayMs: TRANSLATION_RESPONSE_DELAY_MS,
    translatedText: 'YTCQ performance translation'
  }, async (translationStats) => {
    await withExtensionStorageValues(context, 'sync', {
      lastTranslationTarget: TARGET_LANGUAGE,
      sound: false,
      targetLanguage: TARGET_LANGUAGE,
      translationDisplay: 'below'
    }, async () => {
      await withExtensionStorageValues(context, 'local', {
        ytcqInboxKeywords: PERF_KEYWORDS
      }, async () => {
        const chat = await openChat();
        const heapBefore = await collectNativeChatHeapSnapshot(context, page);
        await startNativeChatPerfProbe(chat);
        const { durationMs: continuationIngressMs } = await transport.injectMessages(
          createFastChatMessages()
        );
        const translationDrainMs = await waitForTranslationsToDrain(chat);
        const visibleTranslationCount = await chat.locator(
          `${CONTROLLED_RENDERER_SELECTOR} .ytcq-translation[lang="${TARGET_LANGUAGE}"]`
        ).count();
        const visibleKeywordHighlightCount = await chat.locator(
          `${CONTROLLED_RENDERER_SELECTOR} .ytcq-chat-keyword-highlight`
        ).count();
        const probe = await stopNativeChatPerfProbe(chat);
        const heapAfter = await collectNativeChatHeapSnapshot(context, page);
        const heapGrowthMb = getHeapGrowthMb(heapBefore, heapAfter);

        const report = createPerformanceReport(
          'youtube-native fast chat with translation and inbox keyword matching',
          [
            { label: 'Controlled messages', value: MESSAGE_COUNT },
            { label: 'Continuation ingress', value: formatMs(continuationIngressMs), budget: formatMs(BUDGETS.continuationIngressMs) },
            { label: 'Translation drain', value: formatMs(translationDrainMs), budget: formatMs(BUDGETS.translationDrainMs) },
            { label: 'Translation requests', value: translationStats.requestCount },
            { label: 'Translation items', value: translationStats.translatedItemCount, budget: `>= ${EXPECTED_TRANSLATION_ITEM_FLOOR}` },
            { label: 'Retained controlled translations', value: visibleTranslationCount, budget: `>= ${VISIBLE_MESSAGE_FLOOR}` },
            { label: 'Retained controlled keyword highlights', value: visibleKeywordHighlightCount, budget: `>= ${VISIBLE_MESSAGE_FLOOR}` },
            { label: 'Long tasks', value: probe.longTaskCount },
            { label: 'Max long task', value: formatMs(probe.maxLongTaskMs), budget: formatMs(BUDGETS.maxLongTaskMs) },
            { label: 'p95 frame gap', value: formatMs(probe.p95FrameGapMs), budget: formatMs(BUDGETS.p95FrameGapMs) },
            { label: 'Max frame gap', value: formatMs(probe.maxFrameGapMs) },
            { label: 'Heap growth', value: formatNullableMb(heapGrowthMb), budget: formatMb(BUDGETS.heapGrowthMb) }
          ]
        );

        await writePerformanceReport(testInfo, 'youtube-native-fast-chat', report);
        assertPerformanceBudgets({
          continuationIngressMs,
          heapGrowthMb,
          probe,
          translatedItemCount: translationStats.translatedItemCount,
          translationDrainMs,
          visibleKeywordHighlightCount,
          visibleTranslationCount
        });
      });
    });
  });
});

function createFastChatMessages() {
  return Array.from({ length: MESSAGE_COUNT }, (_, index) => ({
    author: `@PerfViewer${String(index % 18).padStart(2, '0')}`,
    channel: `perf-channel-${index % 18}`,
    text: `${CONTROLLED_TEXT_PREFIX} ${index}: launch priority stream gracias por el directo`
  }));
}

async function waitForTranslationsToDrain(chat: FrameLocator): Promise<number> {
  const startedAt = performance.now();
  await expect.poll(async () => chat.locator(
    `${CONTROLLED_RENDERER_SELECTOR} .ytcq-translation[lang="${TARGET_LANGUAGE}"]`
  ).count(), {
    message: `Expected at least ${MESSAGE_COUNT} translated messages after the fast chat burst.`,
    timeout: BUDGETS.translationDrainMs
  }).toBeGreaterThanOrEqual(VISIBLE_MESSAGE_FLOOR);
  return performance.now() - startedAt;
}

function assertPerformanceBudgets({
  continuationIngressMs,
  heapGrowthMb,
  probe,
  translatedItemCount,
  translationDrainMs,
  visibleKeywordHighlightCount,
  visibleTranslationCount
}: {
  continuationIngressMs: number;
  heapGrowthMb: number | null;
  probe: BrowserPerfProbeSnapshot;
  translatedItemCount: number;
  translationDrainMs: number;
  visibleKeywordHighlightCount: number;
  visibleTranslationCount: number;
}): void {
  expect.soft(continuationIngressMs, 'YouTube should consume the controlled continuations promptly.')
    .toBeLessThanOrEqual(BUDGETS.continuationIngressMs);
  expect.soft(translationDrainMs, 'Translations should drain before the broad performance budget.')
    .toBeLessThanOrEqual(BUDGETS.translationDrainMs);
  expect.soft(visibleTranslationCount, 'YouTube’s retained native rows should render translations.')
    .toBeGreaterThanOrEqual(VISIBLE_MESSAGE_FLOOR);
  expect.soft(visibleKeywordHighlightCount, 'Keyword matching should keep up with retained native rows.')
    .toBeGreaterThanOrEqual(VISIBLE_MESSAGE_FLOOR);
  expect.soft(translatedItemCount, 'The mocked translation endpoint should process the burst.')
    .toBeGreaterThanOrEqual(EXPECTED_TRANSLATION_ITEM_FLOOR);
  expect.soft(probe.maxLongTaskMs, 'No single observed long task should be catastrophic.')
    .toBeLessThanOrEqual(BUDGETS.maxLongTaskMs);
  expect.soft(probe.p95FrameGapMs, 'The page should keep painting under a broad p95 frame-gap budget.')
    .toBeLessThanOrEqual(BUDGETS.p95FrameGapMs);

  if (heapGrowthMb !== null) {
    expect.soft(heapGrowthMb, 'Heap growth should stay within the broad native-chat budget.')
      .toBeLessThanOrEqual(BUDGETS.heapGrowthMb);
  }
}

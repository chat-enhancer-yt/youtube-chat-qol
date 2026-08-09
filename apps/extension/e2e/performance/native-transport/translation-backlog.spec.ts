/**
 * Native YouTube performance coverage for slow and failing translation responses.
 *
 * This stresses the translation queue under pressure from a chat burst larger
 * than the pending-entry cap. The important behavior is that the page stays
 * responsive, the queue keeps progressing, and stale backlog does not explode.
 */
import { expect } from '@playwright/test';
import { nativeYouTubePerformanceTest as test } from '../../support/fixtures/youtube-native-performance';
import { withExtensionStorageValues } from '../../support/extension-storage';
import {
  createPerformanceReport,
  delay,
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

const MESSAGE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_BACKLOG_MESSAGE_COUNT', 360);
const CONTROLLED_TEXT_PREFIX = 'YTCQ backlog';
const TARGET_LANGUAGE = 'cy';
const TRANSLATION_RESPONSE_DELAY_MS = 35;
const TRANSLATION_FAILURE_EVERY = 5;
// The queue intentionally drops stale work above its 300-entry cap, and the
// native client can retire rows before they reach the extension observer. Two
// hundred completed items still proves sustained multi-batch progress while
// the quiet-time and heap assertions verify that the remaining work is bounded.
const MIN_PROGRESS_ITEM_COUNT = Math.min(200, MESSAGE_COUNT);
const CONTROLLED_RENDERER_SELECTOR = 'yt-live-chat-text-message-renderer[id^="ytcq-native-message-"]';

const BUDGETS = {
  continuationIngressMs: 2_500,
  heapGrowthMb: 100,
  maxLongTaskMs: 1_000,
  p95FrameGapMs: 400,
  queueQuietMs: 15_000
};

test('youtube-native performance: slow failing translation backlog remains bounded', async ({
  nativePerformanceSession
}, testInfo) => {
  const { context, openChat, page, transport } = nativePerformanceSession;
  await withMockedPerformanceTranslationEndpoint(context, {
    countText: (text) => text.startsWith(CONTROLLED_TEXT_PREFIX),
    delayMs: TRANSLATION_RESPONSE_DELAY_MS,
    failEvery: TRANSLATION_FAILURE_EVERY,
    translatedText: (requestNumber) => `YTCQ backlog translation ${requestNumber}`
  }, async (translationStats) => {
    await withExtensionStorageValues(context, 'sync', {
      lastTranslationTarget: TARGET_LANGUAGE,
      sound: false,
      targetLanguage: TARGET_LANGUAGE,
      translationDisplay: 'below'
    }, async () => {
      const chat = await openChat();
      const heapBefore = await collectNativeChatHeapSnapshot(context, page);
      await startNativeChatPerfProbe(chat);
      const { durationMs: continuationIngressMs } = await transport.injectMessages(
        createBacklogMessages()
      );
      const queueQuietMs = await waitForTranslationQueueToQuiet(translationStats);
      const visibleTranslationCount = await chat.locator(
        `${CONTROLLED_RENDERER_SELECTOR} .ytcq-translation[lang="${TARGET_LANGUAGE}"]`
      ).count();
      const queuedMessageCount = await chat.locator(
        `${CONTROLLED_RENDERER_SELECTOR}[data-ytcq-translation-key]`
      ).count();
      const probe = await stopNativeChatPerfProbe(chat);
      const heapAfter = await collectNativeChatHeapSnapshot(context, page);
      const heapGrowthMb = getHeapGrowthMb(heapBefore, heapAfter);

      const report = createPerformanceReport(
        'youtube-native slow/failing translation backlog',
        [
          { label: 'Controlled messages', value: MESSAGE_COUNT },
          { label: 'Continuation ingress', value: formatMs(continuationIngressMs), budget: formatMs(BUDGETS.continuationIngressMs) },
          { label: 'Queue quiet', value: formatMs(queueQuietMs), budget: formatMs(BUDGETS.queueQuietMs) },
          { label: 'Translation requests', value: translationStats.requestCount },
          { label: 'Translation items', value: translationStats.translatedItemCount, budget: `>= ${MIN_PROGRESS_ITEM_COUNT}` },
          { label: 'Translation request successes', value: translationStats.successCount },
          { label: 'Translation request failures', value: translationStats.failureCount },
          { label: 'Retained controlled translations', value: visibleTranslationCount },
          { label: 'Retained controlled translation keys', value: queuedMessageCount },
          { label: 'Long tasks', value: probe.longTaskCount },
          { label: 'Max long task', value: formatMs(probe.maxLongTaskMs), budget: formatMs(BUDGETS.maxLongTaskMs) },
          { label: 'p95 frame gap', value: formatMs(probe.p95FrameGapMs), budget: formatMs(BUDGETS.p95FrameGapMs) },
          { label: 'Max frame gap', value: formatMs(probe.maxFrameGapMs) },
          { label: 'Heap growth', value: formatNullableMb(heapGrowthMb), budget: formatMb(BUDGETS.heapGrowthMb) }
        ]
      );

      await writePerformanceReport(testInfo, 'youtube-native-slow-translation-backlog', report);
      assertPerformanceBudgets({
        continuationIngressMs,
        heapGrowthMb,
        probe,
        queueQuietMs,
        translatedItemCount: translationStats.translatedItemCount
      });
    });
  });
});

function createBacklogMessages() {
  return Array.from({ length: MESSAGE_COUNT }, (_, index) => ({
    author: `@BacklogViewer${String(index % 24).padStart(2, '0')}`,
    channel: `backlog-channel-${index % 24}`,
    text: `${CONTROLLED_TEXT_PREFIX} ${index}: mensaje lento con suficiente texto para traducir`
  }));
}

async function waitForTranslationQueueToQuiet(stats: { requestCount: number; translatedItemCount: number }): Promise<number> {
  const startedAt = performance.now();
  await expect.poll(() => stats.translatedItemCount, {
    message: 'Slow translation backlog should keep making request progress.',
    timeout: BUDGETS.queueQuietMs
  }).toBeGreaterThanOrEqual(MIN_PROGRESS_ITEM_COUNT);

  let lastCount = stats.requestCount;
  let lastChangedAt = performance.now();
  while (performance.now() - startedAt < BUDGETS.queueQuietMs) {
    await delay(150);
    if (stats.requestCount !== lastCount) {
      lastCount = stats.requestCount;
      lastChangedAt = performance.now();
    }
    if (performance.now() - lastChangedAt >= 700) break;
  }

  return performance.now() - startedAt;
}

function assertPerformanceBudgets({
  continuationIngressMs,
  heapGrowthMb,
  probe,
  queueQuietMs,
  translatedItemCount
}: {
  continuationIngressMs: number;
  heapGrowthMb: number | null;
  probe: BrowserPerfProbeSnapshot;
  queueQuietMs: number;
  translatedItemCount: number;
}): void {
  expect.soft(continuationIngressMs, 'YouTube should consume the backlog continuations promptly.')
    .toBeLessThanOrEqual(BUDGETS.continuationIngressMs);
  expect.soft(queueQuietMs, 'The slow/failing translation queue should settle within the broad budget.')
    .toBeLessThanOrEqual(BUDGETS.queueQuietMs);
  expect.soft(translatedItemCount, 'The queue should keep processing even when some translations fail.')
    .toBeGreaterThanOrEqual(MIN_PROGRESS_ITEM_COUNT);
  expect.soft(probe.maxLongTaskMs, 'Slow translation responses should not create a catastrophic long task.')
    .toBeLessThanOrEqual(BUDGETS.maxLongTaskMs);
  expect.soft(probe.p95FrameGapMs, 'The page should keep painting under slow translation pressure.')
    .toBeLessThanOrEqual(BUDGETS.p95FrameGapMs);

  if (heapGrowthMb !== null) {
    expect.soft(heapGrowthMb, 'Slow translation backlog heap growth should stay bounded.')
      .toBeLessThanOrEqual(BUDGETS.heapGrowthMb);
  }
}

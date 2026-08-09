/**
 * Native YouTube performance coverage for watched keyword matching.
 *
 * The Inbox supports up to 30 watched keywords/phrases. This test loads that
 * maximum list and delivers a fast chat burst where every message matches both
 * a single keyword and a phrase.
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
  writePerformanceReport,
  type BrowserPerfProbeSnapshot
} from '../../support/performance';
import {
  collectNativeChatHeapSnapshot,
  startNativeChatPerfProbe,
  stopNativeChatPerfProbe
} from '../../support/native-performance';

const MESSAGE_COUNT = getPositiveIntegerEnv('YTCQ_PERF_KEYWORD_MESSAGE_COUNT', 220);
const WATCHED_KEYWORDS = [
  ...Array.from({ length: 20 }, (_, index) => `perfword${index}`),
  ...Array.from({ length: 10 }, (_, index) => `perf phrase ${index}`)
];
const EXPECTED_HIGHLIGHT_FLOOR = Math.min(MESSAGE_COUNT, 100) * 2;
const CONTROLLED_RENDERER_SELECTOR = 'yt-live-chat-text-message-renderer[id^="ytcq-native-message-"]';

const BUDGETS = {
  continuationIngressMs: 2_000,
  heapGrowthMb: 80,
  highlightMs: 3_000,
  maxLongTaskMs: 750,
  p95FrameGapMs: 350
};

test('youtube-native performance: maximum watched keyword list keeps matching responsive', async ({
  nativePerformanceSession
}, testInfo) => {
  const { context, openChat, page, transport } = nativePerformanceSession;
  await withExtensionStorageValues(context, 'sync', {
    sound: false,
    targetLanguage: ''
  }, async () => {
    await withExtensionStorageValues(context, 'local', {
      ytcqInboxKeywords: WATCHED_KEYWORDS
    }, async () => {
      const chat = await openChat();
      const heapBefore = await collectNativeChatHeapSnapshot(context, page);
      await startNativeChatPerfProbe(chat);
      const { durationMs: continuationIngressMs } = await transport.injectMessages(
        createKeywordMessages()
      );
      const highlightMs = await waitForKeywordHighlights(chat);
      const visibleKeywordHighlightCount = await chat.locator(
        `${CONTROLLED_RENDERER_SELECTOR} .ytcq-chat-keyword-highlight`
      ).count();
      const probe = await stopNativeChatPerfProbe(chat);
      const heapAfter = await collectNativeChatHeapSnapshot(context, page);
      const heapGrowthMb = getHeapGrowthMb(heapBefore, heapAfter);

      const report = createPerformanceReport(
        'youtube-native maximum watched keyword matching',
        [
          { label: 'Watched keywords', value: WATCHED_KEYWORDS.length },
          { label: 'Controlled messages', value: MESSAGE_COUNT },
          { label: 'Continuation ingress', value: formatMs(continuationIngressMs), budget: formatMs(BUDGETS.continuationIngressMs) },
          { label: 'Highlight wait', value: formatMs(highlightMs), budget: formatMs(BUDGETS.highlightMs) },
          { label: 'Retained controlled keyword highlights', value: visibleKeywordHighlightCount, budget: `>= ${EXPECTED_HIGHLIGHT_FLOOR}` },
          { label: 'Long tasks', value: probe.longTaskCount },
          { label: 'Max long task', value: formatMs(probe.maxLongTaskMs), budget: formatMs(BUDGETS.maxLongTaskMs) },
          { label: 'p95 frame gap', value: formatMs(probe.p95FrameGapMs), budget: formatMs(BUDGETS.p95FrameGapMs) },
          { label: 'Max frame gap', value: formatMs(probe.maxFrameGapMs) },
          { label: 'Heap growth', value: formatNullableMb(heapGrowthMb), budget: formatMb(BUDGETS.heapGrowthMb) }
        ]
      );

      await writePerformanceReport(testInfo, 'youtube-native-keyword-matching', report);
      assertPerformanceBudgets({
        continuationIngressMs,
        heapGrowthMb,
        highlightMs,
        probe,
        visibleKeywordHighlightCount
      });
    });
  });
});

function createKeywordMessages() {
  return Array.from({ length: MESSAGE_COUNT }, (_, index) => {
    const single = `perfword${index % 20}`;
    const phrase = `perf phrase ${index % 10}`;
    return {
      author: `@KeywordPerf${String(index % 30).padStart(2, '0')}`,
      channel: `keyword-perf-channel-${index % 30}`,
      text: `Checking ${single} while the phrase ${phrase} appears in chat ${index}`
    };
  });
}

async function waitForKeywordHighlights(chat: FrameLocator): Promise<number> {
  const startedAt = performance.now();
  await expect.poll(async () => chat.locator(
    `${CONTROLLED_RENDERER_SELECTOR} .ytcq-chat-keyword-highlight`
  ).count(), {
    message: 'Maximum keyword list should highlight matching chat messages.',
    timeout: BUDGETS.highlightMs
  }).toBeGreaterThanOrEqual(EXPECTED_HIGHLIGHT_FLOOR);
  return performance.now() - startedAt;
}

function assertPerformanceBudgets({
  continuationIngressMs,
  heapGrowthMb,
  highlightMs,
  probe,
  visibleKeywordHighlightCount
}: {
  continuationIngressMs: number;
  heapGrowthMb: number | null;
  highlightMs: number;
  probe: BrowserPerfProbeSnapshot;
  visibleKeywordHighlightCount: number;
}): void {
  expect.soft(continuationIngressMs, 'YouTube should consume the maximum-keyword continuations promptly.')
    .toBeLessThanOrEqual(BUDGETS.continuationIngressMs);
  expect.soft(highlightMs, 'Keyword highlights should appear within budget.')
    .toBeLessThanOrEqual(BUDGETS.highlightMs);
  expect.soft(visibleKeywordHighlightCount, 'Retained native rows should receive keyword highlights.')
    .toBeGreaterThanOrEqual(EXPECTED_HIGHLIGHT_FLOOR);
  expect.soft(probe.maxLongTaskMs, 'Keyword matching should not create a catastrophic long task.')
    .toBeLessThanOrEqual(BUDGETS.maxLongTaskMs);
  expect.soft(probe.p95FrameGapMs, 'Keyword matching should keep the page painting.')
    .toBeLessThanOrEqual(BUDGETS.p95FrameGapMs);

  if (heapGrowthMb !== null) {
    expect.soft(heapGrowthMb, 'Keyword matching heap growth should stay bounded.')
      .toBeLessThanOrEqual(BUDGETS.heapGrowthMb);
  }
}

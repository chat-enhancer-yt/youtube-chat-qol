/** Diagnostics for Lite transport, continuity, and real-network behavior. */
import { expect, type Request } from '@playwright/test';
import {
  YOUTUBE_CHAT_FEED_BATCH_EVENT,
  YOUTUBE_CHAT_FEED_CONTROL_EVENT
} from '../../../src/youtube/chat-feed/protocol';
import type { BrowserScenario, ChatSurface } from '../types';

const LITE_MODE_FALLBACK_EVENT = 'ytcq:lite-mode-fallback';
const DEFAULT_POST_DISCARD_BATCH_TARGET = 2;

interface LiteBatchDiagnostic {
  actions: number;
  at: number;
  compatibilityWarnings?: string[];
  continuationTimeoutMs?: number;
  fatalErrors?: string[];
  sequence?: number;
  source?: string;
  unreadableFeed?: boolean;
  upserts: number;
}

interface LiteEdgeDiagnostic {
  at: number;
  distance: number;
  following: boolean;
  newMessagesVisible: boolean;
}

export interface LiteClientDiagnostics {
  batches: LiteBatchDiagnostic[];
  controls: Array<{ at: number; enabled?: boolean; requestInitial?: boolean }>;
  fallbackReason: string;
  followingLiveEdge: boolean;
  hasLiteRoot: boolean;
  hasNativeList: boolean;
  nativeDiscarded: boolean;
  liteDescendants: number;
  liveEdgeDistance: number;
  liveEdgeSamples: LiteEdgeDiagnostic[];
  liteRows: number;
  nativeDescendants: number;
  newMessagesVisible: boolean;
  pendingLiveActions: number;
  rowAdds: Array<{ at: number; count: number }>;
  visibilityState: string;
}

export interface LiteNetworkRequestDiagnostic {
  at: number;
  framePath: string;
  requestPath: string;
}

export async function installLiteDiagnostics(chat: ChatSurface): Promise<void> {
  await chat.locator('body').evaluate(
    (_body, eventNames) => {
      const testWindow = window as Window & {
        __ytcqLiteBatchCounterAbort?: AbortController;
        __ytcqLiteBatches?: LiteBatchDiagnostic[];
        __ytcqLiteControls?: LiteClientDiagnostics['controls'];
        __ytcqLiteEdgeSamples?: LiteEdgeDiagnostic[];
        __ytcqLiteEdgeTimer?: number;
        __ytcqLiteFallbackReason?: string;
        __ytcqLiteLastBatchSequence?: number;
        __ytcqLiteMutationObserver?: MutationObserver;
        __ytcqLiteRowAdds?: LiteClientDiagnostics['rowAdds'];
      };
      testWindow.__ytcqLiteBatchCounterAbort?.abort();
      testWindow.__ytcqLiteMutationObserver?.disconnect();
      if (testWindow.__ytcqLiteEdgeTimer) {
        window.clearInterval(testWindow.__ytcqLiteEdgeTimer);
      }
      const controller = new AbortController();
      testWindow.__ytcqLiteBatchCounterAbort = controller;
      testWindow.__ytcqLiteBatches = [];
      testWindow.__ytcqLiteControls = [];
      testWindow.__ytcqLiteEdgeSamples = [];
      testWindow.__ytcqLiteFallbackReason = '';
      testWindow.__ytcqLiteLastBatchSequence = 0;
      testWindow.__ytcqLiteRowAdds = [];
      const mutationObserver = new MutationObserver((records) => {
        let count = 0;
        for (const record of records) {
          for (const addedNode of record.addedNodes) {
            if (!(addedNode instanceof Element)) continue;
            if (addedNode.matches('.ytcq-lite-message')) count += 1;
            count += addedNode.querySelectorAll('.ytcq-lite-message').length;
          }
        }
        if (!count) return;
        const rowAdds = testWindow.__ytcqLiteRowAdds || [];
        rowAdds.push({ at: Date.now(), count });
        testWindow.__ytcqLiteRowAdds = rowAdds.slice(-500);
      });
      mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
      testWindow.__ytcqLiteMutationObserver = mutationObserver;
      window.addEventListener(
        eventNames.batch,
        (event) => {
          if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
          try {
            const batch = JSON.parse(event.detail) as {
              actions?: unknown;
              compatibilityWarnings?: unknown;
              continuationTimeoutMs?: unknown;
              fatalErrors?: unknown;
              sequence?: unknown;
              source?: unknown;
              unreadableFeed?: unknown;
            };
            if (Number.isSafeInteger(batch.sequence)) {
              testWindow.__ytcqLiteLastBatchSequence = Number(batch.sequence);
            }
            const batches = testWindow.__ytcqLiteBatches || [];
            batches.push({
              actions: Array.isArray(batch.actions) ? batch.actions.length : -1,
              at: Date.now(),
              ...(Array.isArray(batch.compatibilityWarnings)
                ? {
                    compatibilityWarnings: batch.compatibilityWarnings.filter(
                      (value): value is string => typeof value === 'string'
                    )
                  }
                : {}),
              ...(typeof batch.continuationTimeoutMs === 'number' &&
              Number.isFinite(batch.continuationTimeoutMs)
                ? { continuationTimeoutMs: Number(batch.continuationTimeoutMs) }
                : {}),
              ...(Array.isArray(batch.fatalErrors)
                ? {
                    fatalErrors: batch.fatalErrors.filter(
                      (value): value is string => typeof value === 'string'
                    )
                  }
                : {}),
              ...(Number.isSafeInteger(batch.sequence) ? { sequence: Number(batch.sequence) } : {}),
              ...(typeof batch.source === 'string' ? { source: batch.source } : {}),
              ...(typeof batch.unreadableFeed === 'boolean'
                ? { unreadableFeed: batch.unreadableFeed }
                : {}),
              upserts: Array.isArray(batch.actions)
                ? batch.actions.filter((action) =>
                    Boolean(
                      action &&
                      typeof action === 'object' &&
                      (action as { type?: unknown }).type === 'upsert'
                    )
                  ).length
                : 0
            });
            testWindow.__ytcqLiteBatches = batches.slice(-200);
          } catch {
            // The production receiver owns malformed-batch behavior.
          }
        },
        { signal: controller.signal }
      );
      window.addEventListener(
        eventNames.control,
        (event) => {
          if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
          try {
            const detail = JSON.parse(event.detail) as {
              enabled?: unknown;
              requestInitial?: unknown;
            };
            const controls = testWindow.__ytcqLiteControls || [];
            controls.push({
              at: Date.now(),
              ...(typeof detail.enabled === 'boolean' ? { enabled: detail.enabled } : {}),
              ...(typeof detail.requestInitial === 'boolean'
                ? { requestInitial: detail.requestInitial }
                : {})
            });
            testWindow.__ytcqLiteControls = controls.slice(-50);
          } catch {
            // Production validation owns malformed control events.
          }
        },
        { signal: controller.signal }
      );
      testWindow.__ytcqLiteEdgeTimer = window.setInterval(() => {
        const root = document.querySelector('.ytcq-lite-root');
        const scroller = root?.querySelector<HTMLElement>('.ytcq-lite-scroller');
        const newMessagesButton = root?.querySelector<HTMLButtonElement>('.ytcq-lite-new-messages');
        if (!root || !scroller) return;
        const samples = testWindow.__ytcqLiteEdgeSamples || [];
        samples.push({
          at: Date.now(),
          distance: Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight),
          following: root.getAttribute('aria-live') === 'polite',
          newMessagesVisible: Boolean(newMessagesButton && !newMessagesButton.hidden)
        });
        testWindow.__ytcqLiteEdgeSamples = samples.slice(-500);
      }, 100);
      window.addEventListener(
        eventNames.fallback,
        (event) => {
          if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
          try {
            const detail = JSON.parse(event.detail) as { reason?: unknown };
            if (typeof detail.reason === 'string')
              testWindow.__ytcqLiteFallbackReason = detail.reason;
          } catch {
            testWindow.__ytcqLiteFallbackReason = 'invalid-fallback-detail';
          }
        },
        { signal: controller.signal }
      );
    },
    {
      batch: YOUTUBE_CHAT_FEED_BATCH_EVENT,
      control: YOUTUBE_CHAT_FEED_CONTROL_EVENT,
      fallback: LITE_MODE_FALLBACK_EVENT
    }
  );
}

export async function getLiteDiagnostics(chat: ChatSurface): Promise<LiteClientDiagnostics> {
  return chat.locator('body').evaluate(() => {
    const testWindow = window as Window & {
      __ytcqLiteBatches?: LiteBatchDiagnostic[];
      __ytcqLiteControls?: LiteClientDiagnostics['controls'];
      __ytcqLiteEdgeSamples?: LiteEdgeDiagnostic[];
      __ytcqLiteFallbackReason?: string;
      __ytcqLiteRowAdds?: LiteClientDiagnostics['rowAdds'];
    };
    const root = document.querySelector('.ytcq-lite-root');
    const scroller = root?.querySelector<HTMLElement>('.ytcq-lite-scroller');
    const newMessagesButton = document.querySelector<HTMLButtonElement>('.ytcq-lite-new-messages');
    return {
      batches: testWindow.__ytcqLiteBatches || [],
      controls: testWindow.__ytcqLiteControls || [],
      fallbackReason: testWindow.__ytcqLiteFallbackReason || '',
      followingLiveEdge: root?.getAttribute('aria-live') === 'polite',
      hasLiteRoot: Boolean(root),
      hasNativeList: Boolean(
        document.querySelector('yt-live-chat-item-list-renderer, #chat > #item-list')
      ),
      nativeDiscarded: document.documentElement.hasAttribute('data-ytcq-lite-native-discarded'),
      liteDescendants: root?.querySelectorAll('*').length || 0,
      liveEdgeDistance: scroller
        ? Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight)
        : 0,
      liveEdgeSamples: testWindow.__ytcqLiteEdgeSamples || [],
      liteRows: root?.querySelectorAll('.ytcq-lite-message').length || 0,
      nativeDescendants:
        document
          .querySelector('yt-live-chat-item-list-renderer, #chat > #item-list')
          ?.querySelectorAll('*').length || 0,
      newMessagesVisible: Boolean(newMessagesButton && !newMessagesButton.hidden),
      pendingLiveActions: Number(root?.getAttribute('data-ytcq-lite-pending-live-actions') || 0),
      rowAdds: testWindow.__ytcqLiteRowAdds || [],
      visibilityState: document.visibilityState
    };
  });
}

export async function waitForRequestedLiteInitialSnapshot(chat: ChatSurface): Promise<void> {
  await expect.poll(
    () => chat.locator('body').evaluate(() => {
      const testWindow = window as Window & {
        __ytcqLiteBatches?: LiteBatchDiagnostic[];
        __ytcqLiteControls?: LiteClientDiagnostics['controls'];
      };
      const requested = testWindow.__ytcqLiteControls?.some(
        (control) => control.requestInitial === true
      );
      return !requested || testWindow.__ytcqLiteBatches?.some(
        (batch) => batch.source === 'initial'
      ) === true;
    }),
    { message: 'Expected the requested Lite history snapshot before fault injection.' }
  ).toBe(true);
}

export async function uninstallLiteDiagnostics(chat: ChatSurface): Promise<void> {
  await chat.locator('body').evaluate(() => {
    const testWindow = window as Window & {
      __ytcqLiteBatchCounterAbort?: AbortController;
      __ytcqLiteBatches?: LiteBatchDiagnostic[];
      __ytcqLiteControls?: LiteClientDiagnostics['controls'];
      __ytcqLiteEdgeSamples?: LiteEdgeDiagnostic[];
      __ytcqLiteEdgeTimer?: number;
      __ytcqLiteFallbackReason?: string;
      __ytcqLiteLastBatchSequence?: number;
      __ytcqLiteMutationObserver?: MutationObserver;
      __ytcqLiteRowAdds?: LiteClientDiagnostics['rowAdds'];
    };
    testWindow.__ytcqLiteBatchCounterAbort?.abort();
    testWindow.__ytcqLiteMutationObserver?.disconnect();
    if (testWindow.__ytcqLiteEdgeTimer) window.clearInterval(testWindow.__ytcqLiteEdgeTimer);
    delete testWindow.__ytcqLiteBatchCounterAbort;
    delete testWindow.__ytcqLiteBatches;
    delete testWindow.__ytcqLiteControls;
    delete testWindow.__ytcqLiteEdgeSamples;
    delete testWindow.__ytcqLiteEdgeTimer;
    delete testWindow.__ytcqLiteFallbackReason;
    delete testWindow.__ytcqLiteLastBatchSequence;
    delete testWindow.__ytcqLiteMutationObserver;
    delete testWindow.__ytcqLiteRowAdds;
  });
}

export async function waitForContinuationEvidence({
  baselineSequence,
  chat,
  networkBaseline,
  networkRequests,
  page,
  target,
  timeoutMs
}: {
  baselineSequence: number;
  chat: ChatSurface;
  networkBaseline: number;
  networkRequests: LiteNetworkRequestDiagnostic[];
  page: Parameters<BrowserScenario>[0]['page'];
  target: number;
  timeoutMs: number;
}): Promise<{ batches: number; requests: number }> {
  const deadline = Date.now() + timeoutMs;
  let lastDiagnostics = await getLiteDiagnostics(chat);

  while (Date.now() < deadline) {
    lastDiagnostics = await getLiteDiagnostics(chat);
    if (lastDiagnostics.fallbackReason) {
      throw new Error(`Lite mode fell back while polling: ${JSON.stringify(lastDiagnostics)}`);
    }
    if (
      !lastDiagnostics.hasLiteRoot ||
      !lastDiagnostics.nativeDiscarded ||
      lastDiagnostics.hasNativeList
    ) {
      throw new Error(`Lite mode was removed while polling: ${JSON.stringify(lastDiagnostics)}`);
    }

    const batches = lastDiagnostics.batches.filter(
      (batch) => batch.source === 'live' && (batch.sequence || 0) > baselineSequence
    ).length;
    const requests = networkRequests.length - networkBaseline;
    if (batches >= target && requests >= target) return { batches, requests };
    await page.waitForTimeout(200);
  }

  throw new Error(
    JSON.stringify({
      message: `Expected ${target} post-discard live requests and matching sanitized batches.`,
      batches: lastDiagnostics.batches,
      fallbackReason: lastDiagnostics.fallbackReason,
      postDiscardRequests: networkRequests.length - networkBaseline
    })
  );
}

export function getLatestLiveSequence(diagnostics: LiteClientDiagnostics): number {
  return diagnostics.batches.reduce(
    (latest, batch) =>
      batch.source === 'live' && Number.isSafeInteger(batch.sequence)
        ? Math.max(latest, batch.sequence || 0)
        : latest,
    0
  );
}

export function getContinuationEvidenceTimeout(
  diagnostics: LiteClientDiagnostics,
  target: number
): number {
  const providerTimeout =
    [...diagnostics.batches]
      .reverse()
      .find((batch) => batch.source === 'live' && batch.continuationTimeoutMs)
      ?.continuationTimeoutMs || 0;
  const perBatchTimeout = Math.max(10_000, providerTimeout * 1.5 + 2_000);
  return Math.max(35_000, Math.min(240_000, Math.ceil(target * perBatchTimeout)));
}

export function getLiteNetworkRequestDiagnostic(request: Request): LiteNetworkRequestDiagnostic | null {
  let requestUrl: URL;
  let frameUrl: URL;
  try {
    requestUrl = new URL(request.url());
    frameUrl = new URL(request.frame().url());
  } catch {
    return null;
  }
  if (requestUrl.hostname !== 'www.youtube.com') return null;
  if (requestUrl.pathname !== '/youtubei/v1/live_chat/get_live_chat') return null;
  if (frameUrl.pathname !== '/live_chat') return null;
  return {
    at: Date.now(),
    framePath: frameUrl.pathname,
    requestPath: requestUrl.pathname
  };
}

export function getPostDiscardBatchTarget(): number {
  const value = Number.parseInt(
    process.env.YTCQ_LITE_LIVE_POST_DISCARD_BATCHES ||
      process.env.YTCQ_LITE_LIVE_POST_DETACH_BATCHES ||
      '',
    10
  );
  if (!Number.isFinite(value)) return DEFAULT_POST_DISCARD_BATCH_TARGET;
  return Math.max(1, Math.min(12, value));
}

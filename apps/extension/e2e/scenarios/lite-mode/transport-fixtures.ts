/** Synthetic Lite transport batches and continuity snapshots. */
import {
  YOUTUBE_CHAT_FEED_BATCH_EVENT,
  type YouTubeChatFeedTransportBatch,
  type YouTubeChatMessageRecord
} from '../../../src/youtube/chat-feed/protocol';
import type { ChatSurface } from '../types';
import { NATIVE_LIST_SELECTOR, NATIVE_MESSAGE_SELECTOR } from './selectors';

type SyntheticLiteBatch = Omit<YouTubeChatFeedTransportBatch, 'sequence'>;

export interface LiteContinuityEvidence {
  nativeDescendantDelta: number;
  postDiscardLiteIds: string[];
  restoredOverlapIds: string[];
}

export interface LiteContinuitySnapshot {
  liteIds: string[];
  nativeDescendants: number;
  nativeIds: string[];
}

export async function getLiteContinuitySnapshot(
  chat: ChatSurface
): Promise<LiteContinuitySnapshot> {
  return chat.locator('body').evaluate(
    (_body, selectors) => {
      const nativeList = document.querySelector(selectors.nativeList);
      const getNativeId = (element: Element): string => {
        const data = (element as HTMLElement & { data?: { id?: unknown } }).data;
        if (typeof data?.id === 'string' && data.id) return data.id;
        return element.id;
      };
      return {
        liteIds: Array.from(document.querySelectorAll<HTMLElement>('.ytcq-lite-message'))
          .map((element) => element.dataset.messageId || '')
          .filter(Boolean),
        nativeDescendants: nativeList?.querySelectorAll('*').length || 0,
        nativeIds: nativeList
          ? Array.from(nativeList.querySelectorAll(selectors.nativeMessage))
              .map(getNativeId)
              .filter(Boolean)
          : []
      };
    },
    { nativeList: NATIVE_LIST_SELECTOR, nativeMessage: NATIVE_MESSAGE_SELECTOR }
  );
}

export async function dispatchLiteBatch(
  chat: ChatSurface,
  batch: SyntheticLiteBatch
): Promise<void> {
  await dispatchLiteBatches(chat, [batch]);
}

export async function dispatchLiteBatches(
  chat: ChatSurface,
  batches: SyntheticLiteBatch[]
): Promise<void> {
  await chat.locator('body').evaluate(
    (_body, payload) => {
      const diagnosticSequence =
        (
          window as Window & {
            __ytcqLiteLastBatchSequence?: number;
          }
        ).__ytcqLiteLastBatchSequence || 0;
      const transport = (
        window as unknown as Record<PropertyKey, { sequence?: unknown } | undefined>
      )[Symbol.for('ytcq:lite-chat-transport:v1')];
      const transportSequence = typeof transport?.sequence === 'number' ? transport.sequence : 0;
      let sequence = Math.max(diagnosticSequence, transportSequence);
      for (const batch of payload.batches) {
        sequence += 1;
        if (transport) transport.sequence = sequence;
        window.dispatchEvent(
          new CustomEvent(payload.eventName, {
            detail: JSON.stringify({
              ...batch,
              sequence
            })
          })
        );
      }
    },
    {
      batches,
      eventName: YOUTUBE_CHAT_FEED_BATCH_EVENT
    }
  );
}

export function createBatch(
  actions: YouTubeChatFeedTransportBatch['actions']
): SyntheticLiteBatch {
  return {
    actions,
    receivedAt: Date.now(),
    source: 'live'
  };
}

export function createRecord(id: string, text: string): YouTubeChatMessageRecord {
  return {
    author: {
      badges: [{ label: 'Member' }],
      channelId: 'UCLiteBrowserViewer',
      name: '@LiteViewer'
    },
    id,
    kind: 'text',
    plainText: `${text} :wave:`,
    runs: [
      { text: `${text} `, type: 'text' },
      {
        alt: ':wave:',
        emojiId: 'wave-emoji',
        imageUrl: 'https://www.youtube.com/favicon.ico',
        shortcuts: [':wave:'],
        type: 'emoji'
      }
    ],
    timestampText: '10:30 PM',
    timestampUsec: '1782000000000000'
  };
}

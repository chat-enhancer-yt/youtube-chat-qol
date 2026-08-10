import { describe, expect, it } from 'vitest';
import type { MessageRecord } from './types';
import { mergePinnedUserMessageRecords, removePinnedUserMessageRecords } from './pinned-records';

describe('pinned user message records', () => {
  it('retains missing records, accepts revisions, and stays bounded', () => {
    const first = record(1, 'first');
    const second = record(2, 'second');
    const revisedSecond = record(2, 'second revised');
    const third = record(3, 'third');

    expect(mergePinnedUserMessageRecords([first, second], [revisedSecond, third], 3)).toEqual([
      first,
      revisedSecond,
      third
    ]);
    expect(mergePinnedUserMessageRecords([first, second], [revisedSecond, third], 2)).toEqual([
      revisedSecond,
      third
    ]);
  });

  it('reconciles explicit message and author removals', () => {
    const first = record(1, 'first', 'channel-one');
    const second = record(2, 'second', 'channel-two');

    expect(
      removePinnedUserMessageRecords([first, second], {
        messageId: 'message-1',
        type: 'message'
      })
    ).toEqual([second]);
    expect(
      removePinnedUserMessageRecords([first, second], {
        channelId: 'channel-two',
        type: 'author'
      })
    ).toEqual([first]);
    expect(removePinnedUserMessageRecords([first, second], { type: 'reset' })).toEqual([]);
  });
});

function record(id: number, text: string, channelId = 'channel'): MessageRecord {
  return {
    authorName: '@Viewer',
    channelId,
    contentParts: [{ text, type: 'text' }],
    id,
    messageId: `message-${id}`,
    text,
    timestamp: id,
    timestampText: `${id}:00`
  };
}

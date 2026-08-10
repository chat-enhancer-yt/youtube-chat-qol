/** Bounded snapshots for message-reading surfaces that are currently open. */
import type { MessageRecord } from './types';

// Mirrors the current-page history budget: 12 recent rows across up to 160 users.
export const MAX_USER_MESSAGE_HISTORY_RECORDS = 12 * 160;

export type UserMessageRecordsRemoval =
  | { channelId: string; type: 'author' }
  | { messageId: string; type: 'message' }
  | { type: 'reset' };

export function mergePinnedUserMessageRecords(
  pinnedRecords: readonly MessageRecord[],
  retainedRecords: readonly MessageRecord[],
  limit = MAX_USER_MESSAGE_HISTORY_RECORDS
): MessageRecord[] {
  const recordsByKey = new Map<string, MessageRecord>();
  pinnedRecords.forEach((record) => recordsByKey.set(getRecordKey(record), record));
  retainedRecords.forEach((record) => recordsByKey.set(getRecordKey(record), record));

  const normalizedLimit = Math.max(
    1,
    Math.min(MAX_USER_MESSAGE_HISTORY_RECORDS, Math.floor(limit))
  );
  return [...recordsByKey.values()]
    .sort((a, b) => a.timestamp - b.timestamp || a.id - b.id)
    .slice(-normalizedLimit);
}

export function removePinnedUserMessageRecords(
  records: readonly MessageRecord[],
  removal: UserMessageRecordsRemoval
): MessageRecord[] {
  if (removal.type === 'reset') return [];
  if (removal.type === 'message') {
    return records.filter((record) => record.messageId !== removal.messageId);
  }
  return records.filter((record) => record.channelId !== removal.channelId);
}

function getRecordKey(record: MessageRecord): string {
  const messageId = record.messageId?.trim();
  return messageId ? `message:${messageId}` : `record:${record.id}`;
}

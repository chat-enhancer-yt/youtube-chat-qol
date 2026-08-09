/** Assertions over messages captured by the deterministic Playground backend. */
import { expect } from '@playwright/test';
import type {
  ClientMessage,
  GameActionClientMessage
} from '@chatenhancer/playground-core/protocol';
import { installMockPlaygroundBackend } from '../../support/playground-backend';

type MockPlaygroundBackend = Awaited<ReturnType<typeof installMockPlaygroundBackend>>;

export async function waitForGameAction(
  backend: MockPlaygroundBackend,
  action: string,
  predicate: (message: GameActionClientMessage) => boolean = () => true
): Promise<GameActionClientMessage> {
  await expect
    .poll(
      async () => {
        const messages = await backend.getClientMessages();
        return messages.some(
          (message) =>
            message.type === 'gameAction' &&
            message.action === action &&
            predicate(message)
        );
      },
      {
        message: `Expected Playground game action ${action}.`,
        timeout: 10_000
      }
    )
    .toBe(true);

  const messages = await backend.getClientMessages();
  const match = messages.find(
    (message) =>
      message.type === 'gameAction' && message.action === action && predicate(message)
  );
  if (!match || match.type !== 'gameAction') {
    throw new Error(`Missing Playground game action ${action}.`);
  }
  return match;
}

export async function waitForClientMessage<Type extends ClientMessage['type']>(
  backend: MockPlaygroundBackend,
  type: Type,
  predicate: (message: Extract<ClientMessage, { type: Type }>) => boolean = () => true
): Promise<Extract<ClientMessage, { type: Type }>> {
  await expect
    .poll(
      async () => {
        const messages = await backend.getClientMessages();
        return messages.some((message) => {
          if (message.type !== type) return false;
          return predicate(message as Extract<ClientMessage, { type: Type }>);
        });
      },
      {
        message: `Expected Playground client message ${type}.`,
        timeout: 10_000
      }
    )
    .toBe(true);

  const messages = await backend.getClientMessages();
  const match = messages.find((message) => {
    if (message.type !== type) return false;
    return predicate(message as Extract<ClientMessage, { type: Type }>);
  });
  if (!match || match.type !== type) {
    throw new Error(`Missing Playground client message ${type}.`);
  }
  return match as Extract<ClientMessage, { type: Type }>;
}

export async function expectNoGameAction(
  backend: MockPlaygroundBackend,
  action: string,
  timeoutMs: number,
  predicate: (message: GameActionClientMessage) => boolean = () => true
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  const messages = await backend.getClientMessages();
  expect(
    messages.some(
      (message) =>
        message.type === 'gameAction' && message.action === action && predicate(message)
    )
  ).toBe(false);
}

export async function expectGameActionCount(
  backend: MockPlaygroundBackend,
  action: string,
  expectedCount: number,
  predicate: (message: GameActionClientMessage) => boolean = () => true,
  timeoutMs = 0
): Promise<void> {
  if (timeoutMs > 0) await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  const messages = await backend.getClientMessages();
  const count = messages.filter(
    (message) =>
      message.type === 'gameAction' && message.action === action && predicate(message)
  ).length;
  expect(count).toBe(expectedCount);
}

export async function expectClientMessageCount<Type extends ClientMessage['type']>(
  backend: MockPlaygroundBackend,
  type: Type,
  expectedCount: number,
  timeoutMs = 0
): Promise<void> {
  if (timeoutMs > 0) await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  const messages = await backend.getClientMessages();
  expect(messages.filter((message) => message.type === type)).toHaveLength(expectedCount);
}

export function getBountyObservationPayloads(
  message: GameActionClientMessage
): Array<Record<string, unknown>> {
  const observations = message.payload?.observations;
  return Array.isArray(observations)
    ? observations.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];
}

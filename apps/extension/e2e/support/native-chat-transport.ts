/**
 * Controlled live-chat transport for tests that exercise YouTube's real client.
 *
 * The first continuation response comes from YouTube so its native client can
 * bootstrap normally. Later responses are fulfilled locally with queued
 * `addChatItemAction` values or an empty timed poll. YouTube remains solely
 * responsible for creating, updating, and retaining the resulting renderer
 * elements.
 */
import type { Frame, Page, Request, Route } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';

const GET_LIVE_CHAT_PATH = '/youtubei/v1/live_chat/get_live_chat';
const SEND_LIVE_CHAT_PATH = '/youtubei/v1/live_chat/send_message';
const LOCAL_CONTINUATION_PREFIX = 'ytcq-native-continuation-';
// YouTube's live_chat_polymer smoothing queue uses the largest recent gap
// between action-bearing responses as its rendering interval. Performance
// fixtures warm that queue before measuring; active polls can then drain with
// only the smallest truthy timeout accepted by the client.
const ACTIVE_CONTINUATION_DELAY_MS = 1;
const IDLE_CONTINUATION_DELAY_MS = 50;
const DEFAULT_DELIVERY_TIMEOUT_MS = 30_000;
// YouTube drops part of an unrealistically large action array before extension
// observers can consume it, and large native render batches create artificial
// long tasks. Twenty-five actions remains stressful while resembling a bursty
// live continuation rather than a replay/history payload.
const MAX_ACTIONS_PER_RESPONSE = 25;
const OUTBOUND_AUTHOR = '@CurrentViewer';
const OUTBOUND_CHANNEL = 'UCYtcqVirtualCurrentViewer';

export interface ControlledChatMessage {
  author: string;
  channel?: string;
  text: string;
}

export interface ControlledChatDelivery {
  deliveredIds: string[];
  // Time until YouTube consumes every action-bearing continuation. Its client
  // may render those actions later through the native smoothing queue.
  durationMs: number;
}

export interface InterceptedChatSend {
  messageId: string;
  text: string;
}

interface QueuedChatMessage {
  action: JsonObject;
  delivered: Promise<void>;
  id: string;
  reject: (_error: Error) => void;
  resolve: () => void;
}

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;

export class NativeChatTransport {
  private readonly page: Page;
  private readonly queuedMessages: QueuedChatMessage[] = [];
  private readonly pendingMessages: QueuedChatMessage[] = [];
  private readonly sentMessages: InterceptedChatSend[] = [];
  private readonly frameNavigatedHandler: (_frame: Frame) => void;
  private readonly routeHandler: (_route: Route) => Promise<void>;
  private readonly sendWaiters = new Set<() => void>();
  private readonly currentContinuationTokens = new Set<string>();
  private bootstrapResponse: JsonObject | null = null;
  private continuationTurn: Promise<void> = Promise.resolve();
  private disposed = false;
  private messageSequence = 0;
  private navigationGeneration = 0;
  private responseSequence = 0;
  private readyPromise: Promise<void> = Promise.resolve();
  private rejectReady: (_error: Error) => void = () => undefined;
  private resolveReady: () => void = () => undefined;

  private constructor(page: Page) {
    this.page = page;
    this.frameNavigatedHandler = (frame) => this.handleFrameNavigated(frame);
    this.routeHandler = (route) => this.handleRoute(route);
    this.resetReadyPromise();
  }

  private resetReadyPromise(): void {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  static async install(page: Page): Promise<NativeChatTransport> {
    const transport = new NativeChatTransport(page);
    page.on('framenavigated', transport.frameNavigatedHandler);
    await page.route('**/youtubei/v1/live_chat/**', transport.routeHandler);
    return transport;
  }

  async waitUntilReady(timeoutMs = DEFAULT_DELIVERY_TIMEOUT_MS): Promise<void> {
    await withTimeout(
      this.readyPromise,
      timeoutMs,
      'YouTube did not make a live-chat continuation request for the controlled transport.'
    );
  }

  async injectMessage(message: ControlledChatMessage): Promise<string> {
    const delivery = await this.injectMessages([message]);
    const messageId = delivery.deliveredIds[0];
    if (!messageId) throw new Error('Controlled chat message was not delivered.');
    return messageId;
  }

  async injectMessages(messages: ControlledChatMessage[]): Promise<ControlledChatDelivery> {
    if (this.disposed) throw new Error('The controlled chat transport is closed.');
    if (messages.length === 0) return { deliveredIds: [], durationMs: 0 };

    // YouTube's native action ticker can defer chat rendering in a background
    // tab. Fresh extension profiles also open onboarding once, so make the
    // controlled watch page the active surface before measuring delivery.
    await this.page.bringToFront();
    await this.waitUntilReady();
    const startedAt = performance.now();
    const queued = messages.map((message) => this.createQueuedMessage(message));
    this.queuedMessages.push(...queued);

    await withTimeout(
      Promise.all(queued.map((message) => message.delivered)).then(() => undefined),
      DEFAULT_DELIVERY_TIMEOUT_MS,
      `YouTube did not consume ${messages.length} controlled chat message(s).`
    );

    return {
      deliveredIds: queued.map((message) => message.id),
      durationMs: performance.now() - startedAt
    };
  }

  getSentMessages(): readonly InterceptedChatSend[] {
    return this.sentMessages;
  }

  async waitForSentMessage(
    previousCount = 0,
    timeoutMs = DEFAULT_DELIVERY_TIMEOUT_MS
  ): Promise<InterceptedChatSend> {
    await withTimeout(this.waitForSendCount(previousCount + 1), timeoutMs, [
      'YouTube did not issue the expected live-chat send request.',
      'The request was not forwarded to YouTube.'
    ].join(' '));
    const sentMessage = this.sentMessages[previousCount];
    if (!sentMessage) throw new Error('The intercepted send request was not recorded.');
    return sentMessage;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const error = new Error('The controlled chat transport closed before delivery.');
    this.rejectReady(error);
    this.queuedMessages.splice(0).forEach((message) => message.reject(error));
    this.pendingMessages.splice(0).forEach((message) => message.reject(error));
    this.signalSends();
    this.page.off('framenavigated', this.frameNavigatedHandler);
    await this.page.unroute('**/youtubei/v1/live_chat/**', this.routeHandler);
  }

  private async handleRoute(route: Route): Promise<void> {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === GET_LIVE_CHAT_PATH) {
      const navigationGeneration = this.acceptContinuationRequest(route.request());
      if (navigationGeneration === null) {
        await route.abort('aborted').catch(() => undefined);
        return;
      }
      await this.handleContinuation(route, navigationGeneration);
      return;
    }
    if (pathname === SEND_LIVE_CHAT_PATH) {
      await this.handleSend(route);
      return;
    }
    // Controlled sessions must fail closed: an unfamiliar live-chat endpoint
    // may be a renamed write operation and must never reach YouTube.
    await route.abort('blockedbyclient');
  }

  private async handleContinuation(route: Route, navigationGeneration: number): Promise<void> {
    if (!this.bootstrapResponse) {
      await this.handleBootstrapContinuation(route);
      return;
    }

    // The follow-up request proves that YouTube consumed the intercepted
    // bootstrap. Continue fulfilling timed polls so YouTube's smoothing queue
    // never mistakes test setup time for the desired renderer update interval.
    this.resolveReady();

    let releaseTurn: () => void = () => undefined;
    const previousTurn = this.continuationTurn;
    this.continuationTurn = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });
    await previousTurn;

    try {
      const acknowledgedDelivery = this.acknowledgePendingMessages();
      if (acknowledgedDelivery && this.queuedMessages.length === 0) {
        await route.fulfill({
          json: this.createContinuationResponse([]),
          status: 200
        });
        return;
      }
      await this.deliverContinuation(route, navigationGeneration);
    } finally {
      releaseTurn();
    }
  }

  private acceptContinuationRequest(request: Request): number | null {
    const token = extractContinuationToken(request);
    const isLocalToken = token.startsWith(LOCAL_CONTINUATION_PREFIX);

    if (isLocalToken) {
      if (!this.currentContinuationTokens.delete(token)) return null;
      return this.navigationGeneration;
    }

    if (this.bootstrapResponse) return null;
    return this.navigationGeneration;
  }

  private handleFrameNavigated(frame: Frame): void {
    let pathname = '';
    try {
      pathname = new URL(frame.url()).pathname;
    } catch {
      return;
    }
    if (pathname !== '/live_chat' && pathname !== '/live_chat_replay') return;

    this.navigationGeneration += 1;
    this.bootstrapResponse = null;
    this.currentContinuationTokens.clear();
    this.resetReadyPromise();
  }

  private async deliverContinuation(
    route: Route,
    navigationGeneration: number
  ): Promise<void> {
    if (this.disposed || navigationGeneration !== this.navigationGeneration) {
      await route.abort('aborted').catch(() => undefined);
      return;
    }

    const messages = this.peekQueuedMessages();
    const response = this.createContinuationResponse(messages.map((message) => message.action));
    try {
      await route.fulfill({ json: response, status: 200 });
    } catch {
      return;
    }
    if (messages.length > 0) {
      this.queuedMessages.splice(0, messages.length);
      this.pendingMessages.push(...messages);
    }
  }

  private async handleBootstrapContinuation(route: Route): Promise<void> {
    try {
      const response = await route.fetch();
      const body = asJsonObject(await response.json());
      if (!body || !getLiveChatContinuation(body)) {
        throw new Error('YouTube returned a live-chat response without continuation contents.');
      }

      this.bootstrapResponse = body;
      const bootstrapBody = cloneJson(body);
      const continuation = getLiveChatContinuation(bootstrapBody);
      if (!continuation) throw new Error('Could not clone YouTube live-chat continuation data.');
      // Keep YouTube's response envelope and renderer schema, but do not leak
      // live messages into a controlled scenario. This also prevents the
      // client's action-smoothing queue from measuring test setup time between
      // a real bootstrap action and the first controlled action.
      continuation.actions = [];
      continuation.continuations = [this.createTimedContinuation(IDLE_CONTINUATION_DELAY_MS)];

      await route.fulfill({ response, json: bootstrapBody });
    } catch (error) {
      const transportError = toError(error, 'Could not bootstrap the controlled chat transport.');
      this.rejectReady(transportError);
      this.queuedMessages.splice(0).forEach((message) => message.reject(transportError));
      await route.abort('failed').catch(() => undefined);
    }
  }

  private async handleSend(route: Route): Promise<void> {
    const text = extractSentText(parseRequestBody(route.request()));
    if (!text) {
      await route.abort('failed').catch(() => undefined);
      throw new Error('Could not parse the intercepted YouTube live-chat send payload.');
    }
    const queuedMessage = this.createQueuedMessage({
      author: OUTBOUND_AUTHOR,
      channel: OUTBOUND_CHANNEL,
      text
    });
    const { action, id: messageId } = queuedMessage;

    this.queuedMessages.push(queuedMessage);
    void queuedMessage.delivered.catch(() => undefined);
    this.sentMessages.push({ messageId, text });
    this.signalSends();
    await route.fulfill({
      json: {
        actions: [action],
        responseContext: getResponseContext(this.bootstrapResponse)
      },
      status: 200
    });
  }

  private createQueuedMessage(message: ControlledChatMessage): QueuedChatMessage {
    const action = this.createMessageAction(message);
    const id = getMessageId(action);
    if (!id) throw new Error('Could not create a controlled live-chat message.');

    let resolve: () => void = () => undefined;
    let reject: (_error: Error) => void = () => undefined;
    const delivered = new Promise<void>((nextResolve, nextReject) => {
      resolve = nextResolve;
      reject = nextReject;
    });
    return { action, delivered, id, reject, resolve };
  }

  private acknowledgePendingMessages(): boolean {
    const acknowledged = this.pendingMessages.length > 0;
    this.pendingMessages.splice(0).forEach((message) => message.resolve());
    return acknowledged;
  }

  private createMessageAction(message: ControlledChatMessage): JsonObject {
    this.messageSequence += 1;
    const id = `ytcq-native-message-${Date.now()}-${this.messageSequence}`;
    const author = message.author.startsWith('@') ? message.author : `@${message.author}`;
    const channel = message.channel || `UCYtcqNative${this.messageSequence}`;
    const timestampUsec = String(Date.now() * 1_000 + this.messageSequence);
    const renderer = {
      authorExternalChannelId: channel,
      authorName: { simpleText: author },
      authorPhoto: {
        thumbnails: [
          {
            height: 32,
            url: createAvatarDataUrl(author),
            width: 32
          }
        ]
      },
      id,
      message: { runs: [{ text: message.text }] },
      timestampUsec
    };

    return {
      addChatItemAction: {
        clientId: createNativeClientId(timestampUsec),
        item: {
          liveChatTextMessageRenderer: renderer
        }
      }
    };
  }

  private createContinuationResponse(actions: JsonObject[]): JsonObject {
    if (!this.bootstrapResponse) {
      throw new Error('Cannot create a controlled continuation before YouTube bootstrap.');
    }
    return {
      responseContext: getResponseContext(this.bootstrapResponse),
      continuationContents: {
        liveChatContinuation: {
          actions,
          continuations: [this.createTimedContinuation(
            actions.length > 0 ? ACTIVE_CONTINUATION_DELAY_MS : IDLE_CONTINUATION_DELAY_MS
          )]
        }
      }
    };
  }

  private createTimedContinuation(timeoutMs: number): JsonObject {
    this.responseSequence += 1;
    const continuation = `${LOCAL_CONTINUATION_PREFIX}${this.responseSequence}`;
    this.currentContinuationTokens.add(continuation);
    return {
      timedContinuationData: {
        continuation,
        timeoutMs
      }
    };
  }

  private peekQueuedMessages(): QueuedChatMessage[] {
    return this.queuedMessages.slice(0, MAX_ACTIONS_PER_RESPONSE);
  }

  private waitForSendCount(expectedCount: number): Promise<void> {
    if (this.sentMessages.length >= expectedCount) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const check = () => {
        if (this.disposed || this.sentMessages.length >= expectedCount) {
          this.sendWaiters.delete(check);
          resolve();
        }
      };
      this.sendWaiters.add(check);
    });
  }

  private signalSends(): void {
    [...this.sendWaiters].forEach((check) => check());
  }
}

function getLiveChatContinuation(response: JsonObject): JsonObject | null {
  return asJsonObject(asJsonObject(response.continuationContents)?.liveChatContinuation);
}

function getResponseContext(response: JsonObject | null): JsonObject {
  return cloneJson(asJsonObject(response?.responseContext) || {});
}

function getMessageId(action: JsonObject): string {
  const addAction = asJsonObject(action.addChatItemAction);
  const item = asJsonObject(addAction?.item);
  const renderer = asJsonObject(item?.liveChatTextMessageRenderer);
  return typeof renderer?.id === 'string' ? renderer.id : '';
}

function asJsonObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createAvatarDataUrl(author: string): string {
  const initial = author.replace(/^@/, '').slice(0, 1).toUpperCase() || 'T';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">',
    '<rect width="32" height="32" rx="16" fill="#3f8cff"/>',
    `<text x="16" y="21" text-anchor="middle" fill="white" font-size="16">${escapeXml(initial)}</text>`,
    '</svg>'
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createNativeClientId(timestampUsec: string): string {
  return Buffer.concat([
    Buffer.from([0x08]),
    encodeUnsignedVarint(BigInt(timestampUsec)),
    Buffer.from([0x15]),
    randomBytes(4),
    Buffer.from([0x1d]),
    randomBytes(4)
  ]).toString('base64url');
}

function encodeUnsignedVarint(value: bigint): Buffer {
  const bytes: number[] = [];
  let remaining = value;
  do {
    const next = Number(remaining & 0x7fn);
    remaining >>= 7n;
    bytes.push(remaining > 0n ? next | 0x80 : next);
  } while (remaining > 0n);
  return Buffer.from(bytes);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function extractSentText(value: unknown): string {
  const richMessage = asJsonObject(asJsonObject(value)?.richMessage);
  if (!Array.isArray(richMessage?.textSegments)) return '';
  return richMessage.textSegments
    .map((segment) => asJsonObject(segment)?.text)
    .filter((part): part is string => typeof part === 'string')
    .join('');
}

function extractContinuationToken(request: Request): string {
  const queryToken = new URL(request.url()).searchParams.get('continuation') || '';
  try {
    const body = asJsonObject(parseRequestBody(request));
    return typeof body?.continuation === 'string' ? body.continuation : queryToken;
  } catch {
    return queryToken;
  }
}

function parseRequestBody(request: Request): unknown {
  const postData = request.postDataBuffer();
  if (!postData) return null;

  const contentEncoding = request.headers()['content-encoding']?.toLowerCase();
  const decoded = contentEncoding === 'gzip'
    ? gunzipSync(postData)
    : contentEncoding === 'deflate'
      ? inflateSync(postData)
      : contentEncoding === 'br'
        ? brotliDecompressSync(postData)
        : postData;
  return JSON.parse(decoded.toString('utf8')) as unknown;
}

function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

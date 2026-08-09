/**
 * Shared browser scenario types.
 *
 * A scenario is one feature-level browser check that can run against either
 * the deterministic fixture or YouTube's real chat. Incoming-message injection
 * and outbound capture are optional capabilities on those ordinary surfaces.
 */
import type { BrowserContext, Page } from '@playwright/test';
import type { ControlledChat } from '../support/controlled-chat';
import type { NativeChatTransport } from '../support/native-chat-transport';
import {
  NORMAL_CHAT_MESSAGE_SELECTOR,
  type ChatSurface
} from '../support/chat-surface';

export {
  NORMAL_CHAT_MESSAGE_SELECTOR,
  type ChatSurface
};

export interface BrowserScenarioSession {
  /**
   * Either the mock chat page or the real YouTube chat frame.
   */
  chat: ChatSurface;
  /**
   * The browser context that owns the loaded extension.
   */
  context: BrowserContext;
  /**
   * The top-level YouTube tab that owns the chat surface.
   */
  page: Page;
  /** Surface-neutral ingress when the scenario requires deterministic chat traffic. */
  controlledChat?: ControlledChat;
  /** Native YouTube protocol interception for scenarios that exercise outbound sends. */
  transport?: NativeChatTransport;
}

export interface ExtensionScenarioSession {
  /**
   * The browser context that owns the loaded extension.
   */
  context: BrowserContext;
}

/**
 * Executes one browser-level behavior check.
 * Test titles and browser surfaces are defined by the YouTube catalog and its
 * thin runner specs, not on the scenario itself.
 */
export type BrowserScenario = (..._args: [BrowserScenarioSession]) => Promise<void>;

/** Executes a browser-level check that does not require a YouTube surface. */
export type ExtensionScenario = (..._args: [ExtensionScenarioSession]) => Promise<void>;

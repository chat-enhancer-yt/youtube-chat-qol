/**
 * Shared browser scenario types.
 *
 * A scenario is one feature-level browser check that can run against the
 * deterministic fixture, an uncontrolled real chat, or a real chat whose
 * continuation transport is locally controlled.
 */
import type { BrowserContext, Page } from '@playwright/test';
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
  /** Controlled network ingress when the scenario requires synthetic chat traffic. */
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
 * Test titles and browser surfaces are defined by the plan-case spec files
 * under `e2e/specs/`, not on the scenario itself.
 */
export type BrowserScenario = (..._args: [BrowserScenarioSession]) => Promise<void>;

/** Executes a browser-level check that does not require a YouTube surface. */
export type ExtensionScenario = (..._args: [ExtensionScenarioSession]) => Promise<void>;

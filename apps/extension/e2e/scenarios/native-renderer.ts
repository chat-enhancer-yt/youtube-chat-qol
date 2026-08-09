/** Native-only proof that YouTube consumes the controlled continuation protocol. */
import { expect } from '@playwright/test';
import { requireNativeChatTransport } from '../support/native-chat-transport';
import type { BrowserScenario } from './types';

export const nativeContinuationRendererScenario: BrowserScenario = async ({
  chat,
  transport
}) => {
  const nativeTransport = requireNativeChatTransport(transport);
  const messageId = await nativeTransport.injectMessage({
    author: '@NativeRendererViewer',
    channel: 'UCNativeRendererViewer',
    text: 'Native continuation renderer check'
  });
  const renderer = chat.locator(`#${messageId}`);

  await expect(renderer).toBeVisible({ timeout: 15_000 });
  await expect(renderer.locator('#author-name')).toContainText('@NativeRendererViewer');
  await expect(renderer.locator('#message')).toContainText('Native continuation renderer check');
  await expect(renderer).not.toHaveAttribute('data-ytcq-fixture-message', 'true');
};

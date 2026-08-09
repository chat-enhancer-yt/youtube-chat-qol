/** Shared capability guard for scenarios using controlled native chat traffic. */
import type { NativeChatTransport } from './native-chat-transport';

export function requireNativeChatTransport(
  transport: NativeChatTransport | undefined
): NativeChatTransport {
  if (!transport) {
    throw new Error(
      'This scenario requires the native YouTube client with controlled continuation transport.'
    );
  }
  return transport;
}

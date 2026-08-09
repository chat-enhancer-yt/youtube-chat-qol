/** Performance helpers for YouTube's native chat client and controlled transport. */
import type { BrowserContext, Page } from '@playwright/test';
import type { HeapSnapshot } from './performance';

export type {
  ControlledChatMessage as NativePerfChatMessage,
  NativeChatTransport
} from './native-chat-transport';

export {
  startBrowserPerfProbe as startNativeChatPerfProbe,
  stopBrowserPerfProbe as stopNativeChatPerfProbe
} from './performance';

export async function collectNativeChatHeapSnapshot(
  context: BrowserContext,
  page: Page
): Promise<HeapSnapshot | null> {
  const session = await context.newCDPSession(page).catch(() => null);
  if (!session) return null;

  try {
    await session.send('HeapProfiler.enable');
    await session.send('HeapProfiler.collectGarbage');
    const memory = await session.send('Runtime.getHeapUsage') as {
      totalSize: number;
      usedSize: number;
    };
    return {
      totalMb: memory.totalSize / (1024 * 1024),
      usedMb: memory.usedSize / (1024 * 1024)
    };
  } catch {
    return null;
  } finally {
    await session.detach().catch(() => undefined);
  }
}

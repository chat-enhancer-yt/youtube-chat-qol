import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('background profile avatar bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('registers only profile avatar requests as asynchronous messages', async () => {
    await import('./profile-avatar');
    const listener = getMessageListener();

    expect(listener({ type: 'other' }, {}, vi.fn())).toBe(false);
    expect(listener({ type: 'ytcq:profile-avatar-data', url: '' }, {}, vi.fn())).toBe(true);
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a small raster avatar as a data URL without credentials', async () => {
    vi.mocked(fetch).mockResolvedValue({
      arrayBuffer: () => Promise.resolve(Uint8Array.from([255, 216, 255]).buffer),
      headers: new Headers({
        'content-length': '3',
        'content-type': 'image/jpeg'
      }),
      ok: true
    } as Response);
    await import('./profile-avatar');
    const listener = getMessageListener();
    const sendResponse = vi.fn();
    const avatarUrl = 'https://yt4.ggpht.com/example=s64-c-k-c0x00ffffff-no-rj';

    listener(
      { type: 'ytcq:profile-avatar-data', url: avatarUrl },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        dataUrl: 'data:image/jpeg;base64,/9j/'
      });
    });
    expect(fetch).toHaveBeenCalledWith(avatarUrl, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
  });

  it('rejects non-YouTube hosts before fetching', async () => {
    await import('./profile-avatar');
    const listener = getMessageListener();
    const sendResponse = vi.fn();

    listener(
      { type: 'ytcq:profile-avatar-data', url: 'https://example.test/avatar.png' },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ dataUrl: '' });
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects oversized or non-raster responses', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        headers: new Headers({
          'content-length': String(512 * 1024 + 1),
          'content-type': 'image/png'
        }),
        ok: true
      } as Response)
      .mockResolvedValueOnce({
        headers: new Headers({
          'content-type': 'image/svg+xml'
        }),
        ok: true
      } as Response);
    const { getProfileAvatarDataUrl } = await import('./profile-avatar');
    const avatarUrl = 'https://yt3.ggpht.com/example=s64-c-k-c0x00ffffff-no-rj';

    await expect(getProfileAvatarDataUrl(avatarUrl)).resolves.toBe('');
    await expect(getProfileAvatarDataUrl(avatarUrl)).resolves.toBe('');
  });
});

function getMessageListener(): (
  message: unknown,
  sender: Partial<chrome.runtime.MessageSender>,
  sendResponse: (response?: unknown) => void
) => boolean {
  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0];
  if (!listener) throw new Error('No runtime message listener registered');
  return listener as (
    message: unknown,
    sender: Partial<chrome.runtime.MessageSender>,
    sendResponse: (response?: unknown) => void
  ) => boolean;
}

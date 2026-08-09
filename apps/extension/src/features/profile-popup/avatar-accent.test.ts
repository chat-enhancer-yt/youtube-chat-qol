import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyProfileAvatarAccent,
  deriveProfileAvatarAccentPalette,
  getProfileAvatarAccentPalette
} from './avatar-accent';

const NativeImage = globalThis.Image;

describe('profile avatar accent', () => {
  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      writable: true,
      value: NativeImage
    });
    vi.restoreAllMocks();
  });

  it('selects the strongest chromatic family and creates theme-safe variants', () => {
    const palette = deriveProfileAvatarAccentPalette(
      pixels([
        [248, 248, 248],
        [32, 82, 222],
        [28, 74, 214],
        [35, 88, 230],
        [220, 42, 58]
      ])
    );

    expect(palette).not.toBeNull();
    expect(getHue(palette!.light)).toBeGreaterThan(210);
    expect(getHue(palette!.light)).toBeLessThan(240);
    expect(palette!.light).toMatch(/ 34%\)$/);
    expect(palette!.dark).toMatch(/ 70%\)$/);
  });

  it('ignores neutral and transparent pixels instead of inventing an accent', () => {
    expect(
      deriveProfileAvatarAccentPalette(
        pixels([
          [255, 255, 255],
          [24, 24, 24],
          [128, 128, 128],
          [220, 32, 80, 20]
        ])
      )
    ).toBeNull();
  });

  it('samples each avatar URL once and applies the cached palette to connected cards', async () => {
    const imageLoads = installAvatarSampling(
      pixels([
        [226, 48, 128],
        [218, 42, 120],
        [238, 54, 138]
      ])
    );
    const avatarUrl = 'data:image/png;base64,cached-profile-avatar';

    const firstPalette = getProfileAvatarAccentPalette(avatarUrl);
    const secondPalette = getProfileAvatarAccentPalette(avatarUrl);
    expect(secondPalette).toBe(firstPalette);
    const palette = await firstPalette;
    expect(palette).not.toBeNull();
    expect(imageLoads()).toBe(1);

    const card = document.createElement('section');
    document.body.append(card);
    applyProfileAvatarAccent(card, avatarUrl);

    expect(card.classList.contains('ytcq-profile-card-has-avatar-accent')).toBe(true);
    expect(card.style.getPropertyValue('--ytcq-profile-avatar-accent-light')).toBe(
      palette!.light
    );
    expect(card.style.getPropertyValue('--ytcq-profile-avatar-accent-dark')).toBe(
      palette!.dark
    );
    expect(imageLoads()).toBe(1);
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('reads remote YouTube avatars through the background bridge before sampling', async () => {
    const imageLoads = installAvatarSampling(
      pixels([
        [52, 120, 214],
        [48, 112, 208],
        [60, 128, 224]
      ])
    );
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      message: { type?: string; url?: string },
      callback?: (response: { dataUrl: string }) => void
    ) => {
      callback?.({ dataUrl: 'data:image/jpeg;base64,remote-avatar' });
    }) as typeof chrome.runtime.sendMessage);
    const avatarUrl = 'https://yt4.ggpht.com/remote-profile-avatar=s64-c-k';

    expect(await getProfileAvatarAccentPalette(avatarUrl)).not.toBeNull();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'ytcq:profile-avatar-data',
        url: avatarUrl
      },
      expect.any(Function)
    );
    expect(imageLoads()).toBe(1);
  });

  it('keeps the existing panel colors when the background cannot read the avatar', async () => {
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      _message: { type?: string; url?: string },
      callback?: (response: { dataUrl: string }) => void
    ) => {
      callback?.({ dataUrl: '' });
    }) as typeof chrome.runtime.sendMessage);
    const card = document.createElement('section');
    document.body.append(card);
    const avatarUrl = 'https://yt4.ggpht.com/unavailable-avatar=s64-c-k';

    expect(await getProfileAvatarAccentPalette(avatarUrl)).toBeNull();
    applyProfileAvatarAccent(card, avatarUrl);
    await Promise.resolve();

    expect(card.classList.contains('ytcq-profile-card-has-avatar-accent')).toBe(false);
    expect(card.style.getPropertyValue('--ytcq-profile-avatar-accent-light')).toBe('');
  });
});

function installAvatarSampling(
  sampledPixels: Uint8ClampedArray,
  { fail = false }: { fail?: boolean } = {}
): () => number {
  let imageLoadCount = 0;
  class AvatarImageMock {
    crossOrigin: string | null = null;
    decoding: 'async' | 'auto' | 'sync' = 'auto';
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    referrerPolicy = '';

    set src(_value: string) {
      imageLoadCount += 1;
      queueMicrotask(() => {
        if (fail) this.onerror?.();
        else this.onload?.();
      });
    }
  }

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    writable: true,
    value: AvatarImageMock
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: sampledPixels }))
  } as unknown as CanvasRenderingContext2D);
  return () => imageLoadCount;
}

function pixels(colors: Array<[number, number, number, number?]>): Uint8ClampedArray {
  return new Uint8ClampedArray(
    colors.flatMap(([red, green, blue, alpha = 255]) => [red, green, blue, alpha])
  );
}

function getHue(color: string): number {
  return Number(/^hsl\((\d+)/.exec(color)?.[1] || Number.NaN);
}

const AVATAR_SAMPLE_SIZE = 16;
const AVATAR_HUE_BUCKET_COUNT = 18;
const AVATAR_ACCENT_CACHE_LIMIT = 128;
const MIN_CHROMATIC_SATURATION = 0.18;
const MIN_CHROMATIC_LIGHTNESS = 0.08;
const MAX_CHROMATIC_LIGHTNESS = 0.92;
const PROFILE_AVATAR_MESSAGE_TYPE = 'ytcq:profile-avatar-data';

export interface ProfileAvatarAccentPalette {
  dark: string;
  light: string;
}

interface ChromaticSample {
  hue: number;
  saturation: number;
  weight: number;
}

interface ProfileAvatarAccentCacheEntry {
  palette: ProfileAvatarAccentPalette | null;
  promise: Promise<ProfileAvatarAccentPalette | null>;
  settled: boolean;
}

const avatarAccentPaletteCache = new Map<string, ProfileAvatarAccentCacheEntry>();

export function applyProfileAvatarAccent(card: HTMLElement, avatarSrc: string): void {
  const cachedPalette = avatarAccentPaletteCache.get(avatarSrc.trim());
  if (cachedPalette?.settled) {
    if (cachedPalette.palette) setProfileAvatarAccent(card, cachedPalette.palette);
    return;
  }

  void getProfileAvatarAccentPalette(avatarSrc).then((palette) => {
    if (!palette || !card.isConnected) return;

    setProfileAvatarAccent(card, palette);
  });
}

export function getProfileAvatarAccentPalette(
  avatarSrc: string
): Promise<ProfileAvatarAccentPalette | null> {
  const cacheKey = avatarSrc.trim();
  if (!cacheKey) return Promise.resolve(null);

  const cachedPalette = avatarAccentPaletteCache.get(cacheKey);
  if (cachedPalette) return cachedPalette.promise;

  const cacheEntry: ProfileAvatarAccentCacheEntry = {
    palette: null,
    promise: Promise.resolve(null),
    settled: false
  };
  cacheEntry.promise = sampleProfileAvatarAccent(cacheKey).then((palette) => {
    cacheEntry.palette = palette;
    cacheEntry.settled = true;
    return palette;
  });
  avatarAccentPaletteCache.set(cacheKey, cacheEntry);
  trimAvatarAccentPaletteCache();
  return cacheEntry.promise;
}

export function deriveProfileAvatarAccentPalette(
  pixels: Uint8ClampedArray
): ProfileAvatarAccentPalette | null {
  const samples: ChromaticSample[] = [];
  const hueBucketScores = new Array<number>(AVATAR_HUE_BUCKET_COUNT).fill(0);

  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3] / 255;
    if (alpha < 0.25) continue;

    const { hue, saturation, lightness } = rgbToHsl(
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2]
    );
    if (
      saturation < MIN_CHROMATIC_SATURATION ||
      lightness < MIN_CHROMATIC_LIGHTNESS ||
      lightness > MAX_CHROMATIC_LIGHTNESS
    ) {
      continue;
    }

    const middleLightnessWeight = 1 - Math.abs(lightness - 0.5) * 0.7;
    const weight = alpha * saturation * middleLightnessWeight;
    const bucket = Math.min(
      AVATAR_HUE_BUCKET_COUNT - 1,
      Math.floor((hue / 360) * AVATAR_HUE_BUCKET_COUNT)
    );
    hueBucketScores[bucket] += weight;
    samples.push({ hue, saturation, weight });
  }

  if (!samples.length) return null;

  const strongestBucket = hueBucketScores.reduce(
    (strongest, score, index, scores) => (score > scores[strongest] ? index : strongest),
    0
  );
  const bucketWidth = 360 / AVATAR_HUE_BUCKET_COUNT;
  const bucketCenter = (strongestBucket + 0.5) * bucketWidth;
  let hueVectorX = 0;
  let hueVectorY = 0;
  let saturationTotal = 0;
  let totalWeight = 0;

  samples.forEach((sample) => {
    if (getCircularHueDistance(sample.hue, bucketCenter) > bucketWidth * 1.5) return;

    const radians = (sample.hue * Math.PI) / 180;
    hueVectorX += Math.cos(radians) * sample.weight;
    hueVectorY += Math.sin(radians) * sample.weight;
    saturationTotal += sample.saturation * sample.weight;
    totalWeight += sample.weight;
  });

  if (totalWeight <= 0) return null;

  const hue = normalizeHue((Math.atan2(hueVectorY, hueVectorX) * 180) / Math.PI);
  const saturation = Math.round(clamp((saturationTotal / totalWeight) * 100, 42, 76));
  const roundedHue = Math.round(hue);

  return {
    light: `hsl(${roundedHue} ${saturation}% 34%)`,
    dark: `hsl(${roundedHue} ${Math.max(saturation, 52)}% 70%)`
  };
}

async function sampleProfileAvatarAccent(
  avatarSrc: string
): Promise<ProfileAvatarAccentPalette | null> {
  try {
    const sampleSrc = isLocalAvatarUrl(avatarSrc)
      ? avatarSrc
      : await requestProfileAvatarDataUrl(avatarSrc);
    if (!sampleSrc) return null;

    const image = await loadProfileAvatarImage(sampleSrc);
    // ytcq-allow-raw-create-element: this sampling canvas is never inserted into the page.
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SAMPLE_SIZE;
    canvas.height = AVATAR_SAMPLE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, AVATAR_SAMPLE_SIZE, AVATAR_SAMPLE_SIZE);
    const pixels = context.getImageData(
      0,
      0,
      AVATAR_SAMPLE_SIZE,
      AVATAR_SAMPLE_SIZE
    ).data;
    return deriveProfileAvatarAccentPalette(pixels);
  } catch {
    return null;
  }
}

function loadProfileAvatarImage(avatarSrc: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Avatar color sample unavailable'));
    image.src = avatarSrc;
  });
}

function requestProfileAvatarDataUrl(avatarUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: PROFILE_AVATAR_MESSAGE_TYPE,
          url: avatarUrl
        },
        (response?: { dataUrl?: unknown }) => {
          if (chrome.runtime.lastError) {
            resolve('');
            return;
          }
          resolve(typeof response?.dataUrl === 'string' ? response.dataUrl : '');
        }
      );
    } catch {
      resolve('');
    }
  });
}

function isLocalAvatarUrl(avatarUrl: string): boolean {
  return avatarUrl.startsWith('blob:') || avatarUrl.startsWith('data:');
}

function setProfileAvatarAccent(
  card: HTMLElement,
  palette: ProfileAvatarAccentPalette
): void {
  card.style.setProperty('--ytcq-profile-avatar-accent-light', palette.light);
  card.style.setProperty('--ytcq-profile-avatar-accent-dark', palette.dark);
  card.classList.add('ytcq-profile-card-has-avatar-accent');
}

function trimAvatarAccentPaletteCache(): void {
  while (avatarAccentPaletteCache.size > AVATAR_ACCENT_CACHE_LIMIT) {
    const oldestKey = avatarAccentPaletteCache.keys().next().value;
    if (typeof oldestKey !== 'string') return;
    avatarAccentPaletteCache.delete(oldestKey);
  }
}

function rgbToHsl(redByte: number, greenByte: number, blueByte: number): {
  hue: number;
  lightness: number;
  saturation: number;
} {
  const red = redByte / 255;
  const green = greenByte / 255;
  const blue = blueByte / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (delta === 0) return { hue: 0, lightness, saturation: 0 };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hueSection = 0;
  if (maximum === red) hueSection = ((green - blue) / delta) % 6;
  else if (maximum === green) hueSection = (blue - red) / delta + 2;
  else hueSection = (red - green) / delta + 4;

  return {
    hue: normalizeHue(hueSection * 60),
    lightness,
    saturation
  };
}

function getCircularHueDistance(first: number, second: number): number {
  const directDistance = Math.abs(first - second);
  return Math.min(directDistance, 360 - directDistance);
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

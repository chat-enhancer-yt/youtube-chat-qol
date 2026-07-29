/**
 * Reads YouTube avatar bytes from the background context.
 *
 * Firefox cannot start a CORS image request from an extension content script's
 * expanded principal. Keeping the read here also avoids requesting broad avatar
 * CDN host permissions.
 */
const PROFILE_AVATAR_MESSAGE_TYPE = 'ytcq:profile-avatar-data';
const MAX_PROFILE_AVATAR_BYTES = 512 * 1024;
const PROFILE_AVATAR_HOSTS = new Set(['yt3.ggpht.com', 'yt4.ggpht.com']);
const PROFILE_AVATAR_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

interface ProfileAvatarMessage {
  type?: string;
  url?: unknown;
}

chrome.runtime.onMessage.addListener((message: ProfileAvatarMessage, _sender, sendResponse) => {
  if (!message || message.type !== PROFILE_AVATAR_MESSAGE_TYPE) return false;

  void getProfileAvatarDataUrl(message.url)
    .then((dataUrl) => sendResponse({ dataUrl }))
    .catch(() => sendResponse({ dataUrl: '' }));
  return true;
});

export async function getProfileAvatarDataUrl(value: unknown): Promise<string> {
  const avatarUrl = normalizeProfileAvatarUrl(value);
  if (!avatarUrl) return '';

  const response = await fetch(avatarUrl, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  });
  if (!response.ok) return '';

  const mimeType = (response.headers.get('content-type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (!PROFILE_AVATAR_MIME_TYPES.has(mimeType)) return '';

  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_PROFILE_AVATAR_BYTES) return '';

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_PROFILE_AVATAR_BYTES) return '';

  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

function normalizeProfileAvatarUrl(value: unknown): string {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || !PROFILE_AVATAR_HOSTS.has(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

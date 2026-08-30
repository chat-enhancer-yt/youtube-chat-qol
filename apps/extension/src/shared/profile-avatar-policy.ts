const PROFILE_AVATAR_CDN_DOMAIN = 'ggpht.com';
const PROFILE_AVATAR_SHARD_PATTERN = /^yt[0-9]+$/;

export const PROFILE_AVATAR_CSP_SOURCE = `https://*.${PROFILE_AVATAR_CDN_DOMAIN}`;

export function isProfileAvatarCdnUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false;

  const hostnameSuffix = `.${PROFILE_AVATAR_CDN_DOMAIN}`;
  if (!url.hostname.endsWith(hostnameSuffix)) return false;

  const shardName = url.hostname.slice(0, -hostnameSuffix.length);
  return PROFILE_AVATAR_SHARD_PATTERN.test(shardName);
}

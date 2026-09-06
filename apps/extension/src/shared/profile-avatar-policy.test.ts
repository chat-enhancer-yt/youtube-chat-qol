// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PROFILE_AVATAR_CSP_SOURCE,
  isProfileAvatarCdnUrl
} from './profile-avatar-policy';

describe('profile avatar network policy', () => {
  it('allows current and future numbered YouTube avatar CDN shards', () => {
    expect(PROFILE_AVATAR_CSP_SOURCE).toBe('https://*.ggpht.com');
    expect(isProfileAvatarCdnUrl(new URL('https://yt1.ggpht.com/avatar'))).toBe(true);
    expect(isProfileAvatarCdnUrl(new URL('https://yt2.ggpht.com/avatar'))).toBe(true);
    expect(isProfileAvatarCdnUrl(new URL('https://yt42.ggpht.com/avatar'))).toBe(true);
  });

  it('rejects non-HTTPS and non-shard ggpht hosts', () => {
    expect(isProfileAvatarCdnUrl(new URL('http://yt3.ggpht.com/avatar'))).toBe(false);
    expect(isProfileAvatarCdnUrl(new URL('https://ggpht.com/avatar'))).toBe(false);
    expect(isProfileAvatarCdnUrl(new URL('https://avatars.ggpht.com/avatar'))).toBe(false);
    expect(isProfileAvatarCdnUrl(new URL('https://yt3.example.com/avatar'))).toBe(false);
    expect(isProfileAvatarCdnUrl(new URL('https://yt3.ggpht.com.example.com/avatar'))).toBe(
      false
    );
  });
});

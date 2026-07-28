import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateSettingIcon, type SettingIconAnimation } from './setting-icon-animations';

const animation: SettingIconAnimation = {
  className: 'is-animating',
  durationMs: 100
};

describe('setting icon animations', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores repeated triggers until the active animation finishes', async () => {
    vi.useFakeTimers();
    const icon = document.createElement('svg');

    animateSettingIcon(icon, animation);
    await vi.advanceTimersByTimeAsync(50);
    animateSettingIcon(icon, animation);
    await vi.advanceTimersByTimeAsync(50);

    expect(icon.classList.contains(animation.className)).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    animateSettingIcon(icon, animation);
    await vi.advanceTimersByTimeAsync(49);

    expect(icon.classList.contains(animation.className)).toBe(true);

    await vi.advanceTimersByTimeAsync(51);

    expect(icon.classList.contains(animation.className)).toBe(false);
  });
});

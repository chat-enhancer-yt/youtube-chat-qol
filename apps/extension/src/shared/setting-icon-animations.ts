import { prefersReducedMotion } from './motion';

export interface SettingIconAnimation {
  className: string;
  durationMs: number;
}

export const SETTING_ICON_ANIMATIONS = {
  bell: {
    className: 'ytcq-bell-ringing',
    durationMs: 700
  },
  chatSkin: {
    className: 'ytcq-palette-pop',
    durationMs: 900
  },
  gameInvites: {
    className: 'ytcq-game-controller-hop',
    durationMs: 850
  },
  liteMode: {
    className: 'ytcq-bolt-redraw',
    durationMs: 550
  },
  messageDensity: {
    className: 'ytcq-density-compress',
    durationMs: 700
  },
  playgroundJoystick: {
    className: 'ytcq-playground-joystick-wiggle',
    durationMs: 560
  },
  startupEffect: {
    className: 'ytcq-sparkle-burst',
    durationMs: 1000
  },
  translation: {
    className: 'ytcq-translation-pulse',
    durationMs: 900
  },
  translationDisplay: {
    className: 'ytcq-display-reflow',
    durationMs: 900
  }
} as const satisfies Record<string, SettingIconAnimation>;

export function animateSettingIcon(
  icon: Element | null,
  { className, durationMs }: SettingIconAnimation
): void {
  if (!icon || prefersReducedMotion() || icon.classList.contains(className)) return;

  icon.classList.add(className);
  window.setTimeout(() => {
    icon.classList.remove(className);
  }, durationMs);
}

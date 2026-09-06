import { describe, expect, it } from 'vitest';
import {
  createAddIcon,
  createAvatarRingIcon,
  createBoltIcon,
  createChannelIcon,
  createInboxIcon,
  createLockIcon,
  createSoundBellIcon,
  createSplitTranslateIcon,
  createSvgIcon,
  createTranslateIcon
} from './icons';

describe('shared SVG icon factories', () => {
  it('creates inert SVG wrappers with the supplied viewBox and drawing', () => {
    const icon = createSvgIcon('0 0 24 24', 'M0 0L24 24');

    expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(icon.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(icon.getAttribute('focusable')).toBe('false');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('M0 0L24 24');
  });

  it('provides distinct drawings for different actions and Inbox states', () => {
    const icons = [
      createAddIcon(), createTranslateIcon(), createChannelIcon(),
      createBoltIcon(), createLockIcon(), createInboxIcon(), createInboxIcon(true)
    ];
    const drawings = icons.map((icon) => icon.querySelector('path')?.getAttribute('d'));

    expect(drawings.every(Boolean)).toBe(true);
    expect(new Set(drawings).size).toBe(icons.length);
    expect(icons.every((icon) => icon.hasAttribute('viewBox'))).toBe(true);
  });

  it('links the animated bolt to the supplied drawing mask', () => {
    const icon = createBoltIcon({ drawMaskId: 'test-bolt-draw-mask' });
    const mask = icon.querySelector('mask');

    expect(mask?.id).toBe('test-bolt-draw-mask');
    expect(mask?.children.length).toBeGreaterThan(0);
    expect(icon.querySelector('.lite-mode-bolt-draw')?.getAttribute('mask')).toBe(
      'url(#test-bolt-draw-mask)'
    );
  });

  it('creates split translate icons with configurable classes', () => {
    const icon = createSplitTranslateIcon({
      iconClassName: 'translate-icon',
      sourceClassName: 'translate-source',
      targetClassName: 'translate-target'
    });

    expect(icon.getAttribute('class')).toBe('translate-icon');
    expect([...icon.querySelectorAll('path')].map((path) => path.getAttribute('class'))).toEqual([
      'translate-source', 'translate-target'
    ]);
  });

  it('distinguishes quiet and ringing sound states', () => {
    expect(createSoundBellIcon().querySelector('.ytcq-bell-ring')).toBeNull();
    expect(createSoundBellIcon(true).querySelector('.ytcq-bell-ring')).not.toBeNull();
  });

  it('keeps active avatar ring masks linked and unique across instances', () => {
    const addIcon = createAvatarRingIcon();
    const activeIcon = createAvatarRingIcon(true);
    const activeMask = activeIcon.querySelector('mask');

    expect(addIcon.querySelector('.ytcq-avatar-ring-icon-badge')?.getAttribute('fill')).toBe('none');
    expect(activeMask?.id).toBeTruthy();
    expect(activeMask?.children.length).toBeGreaterThan(0);
    expect(activeIcon.querySelector('.ytcq-avatar-ring-icon-badge')?.getAttribute('mask')).toBe(
      `url(#${activeMask?.id})`
    );
    expect(createAvatarRingIcon(true).querySelector('mask')?.id).not.toBe(activeMask?.id);
  });
});

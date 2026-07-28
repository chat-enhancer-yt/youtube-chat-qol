import { describe, expect, it } from 'vitest';
import {
  ADD_ICON_PATH,
  AVATAR_RING_ACTIVE_BADGE_PATH,
  AVATAR_RING_ADD_BADGE_PATH,
  BOLT_ICON_PATH,
  ICON_VIEW_BOX,
  INBOX_ICON_PATH,
  INBOX_TEXT_ICON_PATH,
  LOCK_ICON_PATH,
  MATERIAL_ICON_VIEW_BOX,
  PLAYGROUND_BASE_ICON_PATH,
  PLAYGROUND_STICK_ICON_PATH,
  SOUND_BELL_BODY_ICON_PATH,
  SOUND_BELL_CLAPPER_ICON_PATH,
  SOUND_BELL_RING_ICON_PATH,
  TRANSLATE_ICON_PATH,
  createAddIcon,
  createAvatarRingIcon,
  createBoltIcon,
  createChannelIcon,
  createInboxIcon,
  createLockIcon,
  createPlaygroundIcon,
  createSoundBellIcon,
  createSplitTranslateIcon,
  createSvgIcon,
  createTranslateIcon
} from './icons';

describe('shared SVG icon factories', () => {
  it('creates accessible inert SVG wrappers with the requested viewBox and path', () => {
    const icon = createSvgIcon(ICON_VIEW_BOX, ADD_ICON_PATH);

    expect(icon.getAttribute('viewBox')).toBe(ICON_VIEW_BOX);
    expect(icon.getAttribute('focusable')).toBe('false');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('path')?.getAttribute('d')).toBe(ADD_ICON_PATH);
  });

  it('creates inbox icon variants from the shared paths', () => {
    expect(createInboxIcon().querySelector('path')?.getAttribute('d')).toBe(INBOX_ICON_PATH);
    expect(createInboxIcon(true).querySelector('path')?.getAttribute('d')).toBe(
      INBOX_TEXT_ICON_PATH
    );
  });

  it('uses the expected view boxes for material and non-material icons', () => {
    expect(createAddIcon().getAttribute('viewBox')).toBe(ICON_VIEW_BOX);
    expect(createTranslateIcon().getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(createTranslateIcon().querySelector('path')?.getAttribute('d')).toBe(
      TRANSLATE_ICON_PATH
    );
    expect(createChannelIcon().getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    const boltIcon = createBoltIcon();
    expect(boltIcon.getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(boltIcon.querySelector('path')?.getAttribute('d')).toBe(BOLT_ICON_PATH);
    expect(boltIcon.getAttribute('fill')).toBeNull();
    const drawableBoltIcon = createBoltIcon({ drawMaskId: 'test-bolt-draw-mask' });
    expect(drawableBoltIcon.querySelector('mask')?.id).toBe('test-bolt-draw-mask');
    expect(drawableBoltIcon.querySelector('.lite-mode-bolt-fill')?.getAttribute('d')).toBe(
      BOLT_ICON_PATH
    );
    expect(drawableBoltIcon.querySelector('.lite-mode-bolt-draw')?.getAttribute('d')).toBe(
      BOLT_ICON_PATH
    );
    expect(drawableBoltIcon.querySelector('.lite-mode-bolt-draw')?.getAttribute('mask')).toBe(
      'url(#test-bolt-draw-mask)'
    );
    const mainDrawMask = drawableBoltIcon.querySelector('.lite-mode-bolt-draw-mask-main');
    expect(mainDrawMask?.tagName.toLowerCase()).toBe('path');
    expect(mainDrawMask?.getAttribute('d')).toMatch(/^M515-790 258-432/);
    expect(mainDrawMask?.getAttribute('pathLength')).toBe('1');
    expect(mainDrawMask?.getAttribute('stroke-dasharray')).toBe('1 2');
    expect(mainDrawMask?.getAttribute('stroke-linecap')).toBe('butt');
    expect(mainDrawMask?.getAttribute('stroke-width')).toBe('170');
    const endDrawMask = drawableBoltIcon.querySelector('.lite-mode-bolt-draw-mask-end');
    expect(endDrawMask?.getAttribute('d')).toBe('M515-520 515-790');
    expect(endDrawMask?.getAttribute('stroke-dasharray')).toBe('1 2');
    expect(endDrawMask?.getAttribute('stroke-linecap')).toBe('round');
    expect(endDrawMask?.getAttribute('stroke-width')).toBe('230');
    const drawMaskBlocker = drawableBoltIcon.querySelector('.lite-mode-bolt-draw-mask-blocker');
    expect(drawMaskBlocker?.getAttribute('d')).toBe('M502-900H620V-560H560L469-480 498-707Z');
    expect(drawMaskBlocker?.getAttribute('fill')).toBe('#000');
    expect(drawableBoltIcon.querySelector('mask')?.getAttribute('mask-type')).toBe('luminance');
    expect(createLockIcon().getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(createLockIcon().querySelector('path')?.getAttribute('d')).toBe(LOCK_ICON_PATH);
  });

  it('creates split translate icons with configurable classes', () => {
    const icon = createSplitTranslateIcon({
      iconClassName: 'translate-icon',
      sourceClassName: 'translate-source',
      targetClassName: 'translate-target'
    });
    const paths = [...icon.querySelectorAll('path')];

    expect(icon.getAttribute('class')).toBe('translate-icon');
    expect(icon.getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(paths.map((path) => path.getAttribute('class'))).toEqual([
      'translate-source',
      'translate-target'
    ]);
  });

  it('creates sound bell icons with a separately animated clapper', () => {
    const quietIcon = createSoundBellIcon();
    const ringingIcon = createSoundBellIcon(true);

    expect(quietIcon.getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(quietIcon.querySelector('.ytcq-bell-body')?.getAttribute('d')).toBe(
      SOUND_BELL_BODY_ICON_PATH
    );
    expect(quietIcon.querySelector('.ytcq-bell-clapper')?.getAttribute('d')).toBe(
      SOUND_BELL_CLAPPER_ICON_PATH
    );
    expect(quietIcon.querySelector('.ytcq-bell-ring')).toBeNull();
    expect(ringingIcon.querySelector('.ytcq-bell-ring')?.getAttribute('d')).toBe(
      SOUND_BELL_RING_ICON_PATH
    );
  });

  it('creates a Playground joystick with its tilting stick behind the base', () => {
    const icon = createPlaygroundIcon();

    expect(icon.getAttribute('viewBox')).toBe(MATERIAL_ICON_VIEW_BOX);
    expect(icon.querySelector('.playground-joystick-base')?.getAttribute('d')).toBe(
      PLAYGROUND_BASE_ICON_PATH
    );
    expect(icon.querySelector('.playground-joystick-stick')?.getAttribute('d')).toBe(
      PLAYGROUND_STICK_ICON_PATH
    );
    expect(Array.from(icon.children, (part) => part.getAttribute('class'))).toEqual([
      'playground-joystick-stick',
      'playground-joystick-base'
    ]);
  });

  it('creates an avatar-and-ring icon with add and active badge states', () => {
    const addIcon = createAvatarRingIcon();
    const activeIcon = createAvatarRingIcon(true);

    expect(addIcon.getAttribute('viewBox')).toBe(ICON_VIEW_BOX);
    expect(addIcon.querySelector('.ytcq-avatar-ring-icon-outline')).not.toBeNull();
    expect(addIcon.querySelector('.ytcq-avatar-ring-icon-badge-symbol')?.getAttribute('d')).toBe(
      AVATAR_RING_ADD_BADGE_PATH
    );
    expect(activeIcon.querySelector('.ytcq-avatar-ring-icon-badge-symbol')?.getAttribute('d')).toBe(
      AVATAR_RING_ACTIVE_BADGE_PATH
    );
  });
});

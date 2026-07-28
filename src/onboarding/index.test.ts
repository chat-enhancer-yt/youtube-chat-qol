import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const preview = vi.hoisted(() => ({
  applyOptions: vi.fn(),
  setChatSkin: vi.fn(),
  setLiteModeEnabled: vi.fn(),
  setPlaygroundEnabled: vi.fn(),
  setTargetLanguage: vi.fn(),
  setTranslationDisplay: vi.fn()
}));

vi.mock('./preview', () => ({
  createOnboardingPreview: vi.fn(() => preview)
}));

const onboardingHtml = readFileSync(path.join(process.cwd(), 'src', 'onboarding.html'), 'utf8');

describe('onboarding settings', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    document.open();
    document.write(onboardingHtml);
    document.close();
    await chrome.storage.sync.clear();
    vi.mocked(chrome.storage.sync.get).mockClear();
    vi.mocked(chrome.storage.sync.set).mockClear();
    Object.values(preview).forEach((mock) => mock.mockClear());
    installMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the popup icon animations for matching onboarding settings', async () => {
    await import('./index');

    const translationIcon = document.querySelector<SVGSVGElement>('.translation-target-icon')!;
    const translationDisplayIcon = document.querySelector<SVGSVGElement>(
      '.translation-display-icon'
    )!;
    const chatSkinIcon = document.querySelector<SVGSVGElement>('.chat-skin-icon')!;
    const liteModeIcons = document.querySelectorAll<SVGSVGElement>('.lite-mode-icon');
    const playgroundIcon = document.querySelector<SVGSVGElement>('.playground-joystick-icon')!;
    const gameInvitesIcon = document.querySelector<SVGSVGElement>('.game-invites-icon')!;

    expect(translationIcon.querySelector('.translation-source-mark')).not.toBeNull();
    expect(translationIcon.querySelector('.translation-target-mark')).not.toBeNull();
    expect(translationDisplayIcon.querySelector('.translation-display-frame')).not.toBeNull();
    expect(translationDisplayIcon.querySelectorAll('.translation-display-line')).toHaveLength(3);
    expect(chatSkinIcon.querySelector('.chat-skin-palette-body')).not.toBeNull();
    expect(chatSkinIcon.querySelectorAll('.chat-skin-palette-spot')).toHaveLength(4);
    expect(liteModeIcons).toHaveLength(2);
    expect(playgroundIcon.querySelector('.playground-joystick-base')).not.toBeNull();
    expect(playgroundIcon.querySelector('.playground-joystick-stick')).not.toBeNull();

    const targetLanguage = document.querySelector<HTMLSelectElement>('#onboardingTargetLanguage')!;
    targetLanguage.value = 'ja';
    targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));

    const translationDisplay = document.querySelector<HTMLSelectElement>(
      '#onboardingTranslationDisplay'
    )!;
    translationDisplay.value = 'below';
    translationDisplay.dispatchEvent(new Event('change', { bubbles: true }));

    const chatSkin = document.querySelector<HTMLSelectElement>('#onboardingChatSkin')!;
    chatSkin.value = 'aero';
    chatSkin.dispatchEvent(new Event('change', { bubbles: true }));

    const playgroundEnabled = document.querySelector<HTMLInputElement>(
      '#onboardingPlaygroundEnabled'
    )!;
    playgroundEnabled.checked = true;
    playgroundEnabled.dispatchEvent(new Event('change', { bubbles: true }));

    const liteModeEnabled = document.querySelector<HTMLInputElement>('#onboardingLiteModeEnabled')!;
    liteModeEnabled.checked = true;
    liteModeEnabled.dispatchEvent(new Event('change', { bubbles: true }));

    expect(translationIcon.classList.contains('ytcq-translation-pulse')).toBe(true);
    expect(translationDisplayIcon.classList.contains('ytcq-display-reflow')).toBe(true);
    expect(chatSkinIcon.classList.contains('ytcq-palette-pop')).toBe(true);
    expect(playgroundIcon.classList.contains('ytcq-playground-joystick-wiggle')).toBe(true);
    expect(gameInvitesIcon.classList.contains('ytcq-game-controller-hop')).toBe(true);
    liteModeIcons.forEach((icon) => {
      expect(icon.classList.contains('ytcq-bolt-redraw')).toBe(true);
      expect(icon.querySelector('.lite-mode-bolt-fill')).not.toBeNull();
      expect(icon.querySelector('.lite-mode-bolt-draw')).not.toBeNull();
      expect(icon.querySelector('.lite-mode-bolt-draw-mask-main')).not.toBeNull();
      expect(icon.querySelector('.lite-mode-bolt-draw-mask-blocker')).not.toBeNull();
      expect(icon.querySelector('.lite-mode-bolt-draw-mask-end')).not.toBeNull();
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(translationIcon.classList.contains('ytcq-translation-pulse')).toBe(false);
    expect(translationDisplayIcon.classList.contains('ytcq-display-reflow')).toBe(false);
    expect(chatSkinIcon.classList.contains('ytcq-palette-pop')).toBe(false);
    expect(playgroundIcon.classList.contains('ytcq-playground-joystick-wiggle')).toBe(false);
    expect(gameInvitesIcon.classList.contains('ytcq-game-controller-hop')).toBe(false);
    liteModeIcons.forEach((icon) => {
      expect(icon.classList.contains('ytcq-bolt-redraw')).toBe(false);
    });

    targetLanguage.value = '';
    targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));
    chatSkin.value = 'system';
    chatSkin.dispatchEvent(new Event('change', { bubbles: true }));
    playgroundEnabled.checked = false;
    playgroundEnabled.dispatchEvent(new Event('change', { bubbles: true }));
    liteModeEnabled.checked = false;
    liteModeEnabled.dispatchEvent(new Event('change', { bubbles: true }));

    expect(translationIcon.classList.contains('ytcq-translation-pulse')).toBe(false);
    expect(chatSkinIcon.classList.contains('ytcq-palette-pop')).toBe(false);
    expect(playgroundIcon.classList.contains('ytcq-playground-joystick-wiggle')).toBe(false);
    expect(gameInvitesIcon.classList.contains('ytcq-game-controller-hop')).toBe(false);
    liteModeIcons.forEach((icon) => {
      expect(icon.classList.contains('ytcq-bolt-redraw')).toBe(false);
    });
  });

  it('commits the collapsed translation display row before animating it open', async () => {
    await import('./index');

    const targetLanguage = document.querySelector<HTMLSelectElement>('#onboardingTargetLanguage')!;
    const translationDisplayRow = document.querySelector<HTMLElement>(
      '#onboardingTranslationDisplayRow'
    )!;
    const committedStates: boolean[] = [];
    Object.defineProperty(translationDisplayRow, 'offsetHeight', {
      configurable: true,
      get: () => {
        committedStates.push(
          translationDisplayRow.classList.contains('translation-display-row-collapsed')
        );
        return 0;
      }
    });

    targetLanguage.value = 'ja';
    targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));

    expect(committedStates).toEqual([true]);
    expect(translationDisplayRow.hidden).toBe(false);
    expect(translationDisplayRow.classList.contains('translation-display-row-collapsed')).toBe(
      false
    );

    targetLanguage.value = '';
    targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));

    expect(translationDisplayRow.hidden).toBe(false);
    expect(translationDisplayRow.classList.contains('translation-display-row-collapsed')).toBe(
      true
    );
    await vi.advanceTimersByTimeAsync(180);
    expect(translationDisplayRow.hidden).toBe(true);
  });

  it('uses the localized translated prefix in the below-message preview', async () => {
    vi.mocked(chrome.i18n.getMessage).mockImplementation((key: string) =>
      key === 'translated' ? 'Traduit :' : key
    );

    await import('./index');

    expect(document.querySelector('#previewTranslationPrefix')?.textContent).toBe('Traduit :');
    expect(document.querySelector('#previewBelowTranslateIcon')).toBeNull();
  });

  it('does not animate onboarding setting icons when reduced motion is preferred', async () => {
    installMatchMedia(true);
    await import('./index');

    const targetLanguage = document.querySelector<HTMLSelectElement>('#onboardingTargetLanguage')!;
    targetLanguage.value = 'ja';
    targetLanguage.dispatchEvent(new Event('change', { bubbles: true }));

    const translationDisplay = document.querySelector<HTMLSelectElement>(
      '#onboardingTranslationDisplay'
    )!;
    translationDisplay.value = 'below';
    translationDisplay.dispatchEvent(new Event('change', { bubbles: true }));

    const chatSkin = document.querySelector<HTMLSelectElement>('#onboardingChatSkin')!;
    chatSkin.value = 'aero';
    chatSkin.dispatchEvent(new Event('change', { bubbles: true }));

    const playgroundEnabled = document.querySelector<HTMLInputElement>(
      '#onboardingPlaygroundEnabled'
    )!;
    playgroundEnabled.checked = true;
    playgroundEnabled.dispatchEvent(new Event('change', { bubbles: true }));

    const liteModeEnabled = document.querySelector<HTMLInputElement>('#onboardingLiteModeEnabled')!;
    liteModeEnabled.checked = true;
    liteModeEnabled.dispatchEvent(new Event('change', { bubbles: true }));

    expect(
      document
        .querySelector('.translation-target-icon')
        ?.classList.contains('ytcq-translation-pulse')
    ).toBe(false);
    expect(
      document.querySelector('.translation-display-icon')?.classList.contains('ytcq-display-reflow')
    ).toBe(false);
    expect(document.querySelector('.chat-skin-icon')?.classList.contains('ytcq-palette-pop')).toBe(
      false
    );
    document.querySelectorAll('.lite-mode-icon').forEach((icon) => {
      expect(icon.classList.contains('ytcq-bolt-redraw')).toBe(false);
    });
    expect(
      document
        .querySelector('.playground-joystick-icon')
        ?.classList.contains('ytcq-playground-joystick-wiggle')
    ).toBe(false);
    expect(
      document.querySelector('.game-invites-icon')?.classList.contains('ytcq-game-controller-hop')
    ).toBe(false);
  });
});

function installMatchMedia(reducedMotion: boolean): void {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn()
      }) as MediaQueryList
  );
}

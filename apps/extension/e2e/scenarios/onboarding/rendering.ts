/** Initial rendering and layout coverage for the extension onboarding page. */
import { expect } from '@playwright/test';
import type { ExtensionScenario } from '../types';
import { withOnboardingPage } from './fixture';

export const onboardingRenderingScenario: ExtensionScenario = async ({ context }) => {
  await withOnboardingPage(context, async (onboarding) => {
    await expect(onboarding.locator('link[href="content.css"]')).toHaveCount(1);
    await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute(
      'href',
      'https://www.chatenhancer.com/'
    );
    await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute('target', '_blank');
    await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute(
      'aria-label',
      'Chat Enhancer for YouTube'
    );
    await expect(onboarding.locator('.onboarding-brand img')).toHaveAttribute('src', 'logo.png');
    await expect(onboarding.locator('.onboarding-brand img')).toHaveAttribute('alt', '');
    await expect
      .poll(() =>
        onboarding.locator('[data-i18n]').evaluateAll((elements) =>
          elements.every((element) => {
            const key = (element as HTMLElement).dataset.i18n;
            return Boolean(element.textContent?.trim()) && element.textContent !== key;
          })
        )
      )
      .toBe(true);
    await expect(onboarding.locator('.settings-intro h1')).toHaveText('Welcome aboard!');
    await expect(onboarding.locator('.settings-intro h1')).toHaveCSS('font-weight', '400');
    await expect(onboarding.locator('.setting-row-toggle .option-beta-badge')).toHaveCount(2);
    await expect
      .poll(() =>
        onboarding
          .locator('.setting-row-toggle .option-beta-badge')
          .evaluateAll((badges) => badges.map((badge) => badge.textContent))
      )
      .toEqual(['Beta', 'Beta']);
    await expect(onboarding.locator('.setting-row-toggle .option-beta-badge').first()).toHaveCSS(
      'font-size',
      '9px'
    );
    await expect(onboarding.locator('.setting-row-toggle .option-beta-badge').first()).toHaveCSS(
      'min-height',
      '13px'
    );
    await expect(onboarding.locator('html')).toHaveCSS('color-scheme', 'light');
    await expect(onboarding.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(onboarding.locator('body')).toHaveCSS('color', 'rgb(15, 15, 15)');
    await expect(onboarding.locator('.settings-list > .setting-row').first()).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.04)'
    );
    await expect(onboarding.locator('#onboardingChatSkin')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    );
    await expect(onboarding.locator('.settings-note')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.04)'
    );
    await expect(onboarding.locator('.settings-close-note')).toHaveText(
      'Feel free to close this tab when you’re finished.'
    );
    await expect(onboarding.locator('.settings-close-note')).toHaveCSS('font-weight', '400');
    await expect
      .poll(async () => {
        const [column, panel, note] = await Promise.all([
          onboarding.locator('.settings-column').boundingBox(),
          onboarding.locator('.settings-panel').boundingBox(),
          onboarding.locator('.settings-close-note').boundingBox()
        ]);
        if (!column || !panel || !note) return false;
        return note.y >= panel.y + panel.height && note.y + note.height <= column.y + column.height;
      })
      .toBe(true);
    await expect(onboarding.locator('.preview-hover-hint')).toHaveText(
      'Hover over icons for more information.'
    );
    await expect(onboarding.locator('.preview-hover-hint')).toHaveCSS('color', 'rgb(96, 96, 96)');
    await expect(onboarding.locator('.preview-hover-hint')).toHaveCSS('font-size', '13px');
    await expect(onboarding.locator('.preview-feature-breakdown')).toHaveText(
      'Visit chatenhancer.com for a full breakdown of the features.'
    );
    await expect(onboarding.locator('.preview-feature-breakdown a')).toHaveAttribute(
      'href',
      'https://www.chatenhancer.com/'
    );
    await expect(onboarding.locator('.preview-feature-breakdown a')).toHaveAttribute(
      'target',
      '_blank'
    );
    await expect(onboarding.locator('.preview-feature-breakdown a')).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
    await expect
      .poll(async () => {
        const [title, hint, preview] = await Promise.all([
          onboarding.locator('.preview-title').boundingBox(),
          onboarding.locator('.preview-hover-hint').boundingBox(),
          onboarding.locator('#chatPreview').boundingBox()
        ]);
        if (!title || !hint || !preview) return false;
        return hint.y >= title.y + title.height && hint.y + hint.height <= preview.y;
      })
      .toBe(true);
    await expect
      .poll(async () => {
        const [preview, breakdown] = await Promise.all([
          onboarding.locator('#chatPreview').boundingBox(),
          onboarding.locator('.preview-feature-breakdown').boundingBox()
        ]);
        if (!preview || !breakdown) return false;
        return breakdown.y >= preview.y + preview.height;
      })
      .toBe(true);
    await expect(onboarding.locator('.preview-title img')).toHaveCSS('object-fit', 'contain');
    await expect
      .poll(async () =>
        onboarding.locator('.preview-title img').evaluate((image) => {
          const bounds = image.getBoundingClientRect();
          return Math.abs(bounds.width - bounds.height);
        })
      )
      .toBeLessThan(0.1);
    await expect(onboarding.locator('#onboardingTargetLanguage')).toHaveValue('');
    await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeHidden();
    await expect(onboarding.locator('#previewGamesIcon')).toBeHidden();
    await expect(onboarding.locator('#previewLiteCallout')).toBeHidden();
    await expect(onboarding.locator('#previewPlaygroundCallout')).toBeHidden();
    await expect(onboarding.locator('#previewLiteModeTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewInboxTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewLiteIcon')).not.toHaveClass(/preview-icon-active/u);
    await expect(onboarding.locator('.preview-top-chat')).toHaveCSS('font-size', '16px');
    await expect(onboarding.locator('.preview-top-chat')).toHaveCSS('font-weight', '300');
    await expect
      .poll(() =>
        onboarding.locator('.onboarding-shell').evaluate((shell) => getComputedStyle(shell).zoom)
      )
      .toBe('1');
    await expect
      .poll(async () => {
        const [preview, header, caret, row, avatar] = await Promise.all([
          onboarding.locator('#chatPreview').boundingBox(),
          onboarding.locator('.preview-chat-header').boundingBox(),
          onboarding.locator('.preview-top-chat svg').boundingBox(),
          onboarding.locator('.preview-message').first().boundingBox(),
          onboarding.locator('.preview-avatar').first().boundingBox()
        ]);
        return {
          avatar: Math.round(avatar?.height || 0),
          caret: Math.round(caret?.height || 0),
          header: Math.round(header?.height || 0),
          previewHeight: Math.round(preview?.height || 0),
          previewWidth: Math.round(preview?.width || 0),
          row: Math.round(row?.height || 0)
        };
      })
      .toEqual({
        avatar: 24,
        caret: 24,
        header: 48,
        previewHeight: 579,
        previewWidth: 381,
        row: 32
      });
    await expect
      .poll(async () => {
        const [translation, emoji] = await Promise.all([
          onboarding.locator('#previewComposerTranslateIcon').boundingBox(),
          onboarding.locator('.preview-emoji').boundingBox()
        ]);
        if (!translation || !emoji) return 0;
        return Math.round(emoji.x + emoji.width / 2 - (translation.x + translation.width / 2));
      })
      .toBe(34);
    const draftTranslator = onboarding.locator('#previewComposerTranslateIcon');
    await expect(draftTranslator).toHaveCSS('color', 'rgba(17, 17, 17, 0.6)');
    await draftTranslator.hover();
    await expect(draftTranslator).toHaveCSS('color', 'rgb(15, 15, 15)');
    const nativeLightIcons = [
      onboarding.locator('#previewLiteIcon'),
      onboarding.locator('#previewInboxIcon'),
      onboarding.locator('.preview-native-header-icon').first(),
      onboarding.locator('.preview-native-header-icon').last(),
      onboarding.locator('.preview-emoji')
    ];
    for (const icon of nativeLightIcons) {
      await expect(icon).toHaveCSS('color', 'rgb(15, 15, 15)');
      await icon.hover();
      await expect(icon).toHaveCSS('color', 'rgb(15, 15, 15)');
    }
    await onboarding.locator('#previewLiteIcon').hover();
    await expect(onboarding.locator('#previewLiteIcon')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.2)'
    );
    await onboarding.locator('#previewInboxIcon').hover();
    await expect(onboarding.locator('#previewInboxIcon')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.2)'
    );
    await onboarding.locator('.preview-native-header-icon').first().hover();
    await expect(onboarding.locator('.preview-native-header-icon').first()).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.2)'
    );
    await expect(onboarding.locator('.preview-top-chat')).toHaveCSS('color', 'rgb(15, 15, 15)');
    await expect(onboarding.locator('.preview-top-chat svg')).toHaveCSS(
      'fill',
      'rgb(15, 15, 15)'
    );
    await expect(onboarding.locator('.preview-send button')).toHaveCSS(
      'color',
      'rgb(144, 144, 144)'
    );
    await expect
      .poll(() =>
        onboarding
          .locator('.preview-skeleton-row')
          .first()
          .evaluate((row) => getComputedStyle(row, '::before').filter)
      )
      .toBe('invert(1)');
    await expect(onboarding.locator('.preview-native-header-icon path').first()).toHaveCSS(
      'fill',
      'rgb(15, 15, 15)'
    );

    await onboarding.emulateMedia({ colorScheme: 'dark' });
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute('data-chat-theme', 'dark');
    await expect(draftTranslator).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');
    await draftTranslator.hover();
    await expect(draftTranslator).toHaveCSS('color', 'rgb(255, 255, 255)');
    const darkPrimaryIcons = [
      onboarding.locator('#previewLiteIcon'),
      onboarding.locator('#previewInboxIcon'),
      onboarding.locator('.preview-emoji')
    ];
    for (const icon of darkPrimaryIcons) {
      await expect(icon).toHaveCSS('color', 'rgb(255, 255, 255)');
      await icon.hover();
      await expect(icon).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
    await onboarding.locator('#previewLiteIcon').hover();
    await expect(onboarding.locator('#previewLiteIcon')).toHaveCSS(
      'background-color',
      'rgba(255, 255, 255, 0.2)'
    );
    await onboarding.locator('#previewInboxIcon').hover();
    await expect(onboarding.locator('#previewInboxIcon')).toHaveCSS(
      'background-color',
      'rgba(255, 255, 255, 0.2)'
    );
    const darkNativeIcons = onboarding.locator('.preview-native-header-icon');
    for (const icon of await darkNativeIcons.all()) {
      await expect(icon).toHaveCSS('color', 'rgb(241, 241, 241)');
      await icon.hover();
      await expect(icon).toHaveCSS('color', 'rgb(241, 241, 241)');
    }
    await darkNativeIcons.first().hover();
    await expect(darkNativeIcons.first()).toHaveCSS(
      'background-color',
      'rgba(255, 255, 255, 0.2)'
    );
    await expect(onboarding.locator('.preview-top-chat')).toHaveCSS(
      'color',
      'rgb(255, 255, 255)'
    );
    await expect(onboarding.locator('.preview-top-chat svg')).toHaveCSS(
      'fill',
      'rgb(241, 241, 241)'
    );
    await expect(onboarding.locator('.preview-send button')).toHaveCSS(
      'color',
      'rgb(113, 113, 113)'
    );
  });
};

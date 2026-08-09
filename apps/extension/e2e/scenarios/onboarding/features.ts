/** Feature, theme, and persistence coverage for the extension onboarding preview. */
import { expect } from '@playwright/test';
import type { ExtensionScenario } from '../types';
import { expectStoredOnboardingOptions, withOnboardingPage } from './fixture';

export const onboardingFeaturePreviewScenario: ExtensionScenario = async ({ context }) => {
  await withOnboardingPage(context, async (onboarding) => {
    await onboarding.locator('#onboardingTargetLanguage').selectOption('ja');
    await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeVisible();
    await onboarding.locator('#onboardingTranslationDisplay').selectOption('below');
    await onboarding.locator('#onboardingPlaygroundEnabled').check();
    await onboarding.locator('#onboardingLiteModeEnabled').check();
    await onboarding.locator('#onboardingChatSkin').selectOption('aero');

    await expect(onboarding.locator('#previewGamesIcon')).toBeVisible();
    await expect(onboarding.locator('#previewGamesIcon')).toHaveCSS(
      'animation-name',
      'preview-icon-enter'
    );
    await expect(onboarding.locator('#previewLiteIcon')).toHaveClass(/preview-icon-active/u);
    await expect(onboarding.locator('#previewLiteIcon')).toHaveCSS('transform', 'none');
    await expect(onboarding.locator('#previewLiteIcon svg')).toHaveCSS(
      'animation-name',
      'preview-icon-bounce'
    );
    await expect(onboarding.locator('#previewLiteCallout')).toBeVisible();
    await expect(onboarding.locator('#previewLiteCallout')).toHaveAttribute('aria-hidden', 'false');
    await expect(onboarding.locator('#previewLiteCallout')).toHaveCSS(
      'animation-name',
      'preview-callout-enter'
    );
    await expect(onboarding.locator('#previewLiteCallout')).toHaveText(
      'Lite mode, when enabled, will make live chat use less resources. You can always switch back to native by clicking this toggle.'
    );
    await expect(onboarding.locator('#previewLiteCallout .preview-callout-link')).toHaveText(
      'Lite mode'
    );
    await expect(onboarding.locator('#previewLiteCallout .preview-callout-link')).toHaveAttribute(
      'href',
      'https://www.chatenhancer.com/blog/introducing-lite-mode/'
    );
    await expect(onboarding.locator('#previewLiteCallout .preview-callout-link')).toHaveAttribute(
      'target',
      '_blank'
    );
    await expect(onboarding.locator('#previewLiteCallout .preview-callout-link')).toHaveCSS(
      'pointer-events',
      'auto'
    );
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute('role', 'group');
    await expect(onboarding.locator('.preview-chat-renderer')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    await expect(onboarding.locator('#previewPlaygroundCallout')).toBeVisible();
    await expect(onboarding.locator('#previewPlaygroundCallout')).toHaveAttribute(
      'aria-hidden',
      'false'
    );
    await expect(onboarding.locator('#previewPlaygroundCallout')).toHaveCSS(
      'animation-name',
      'preview-callout-enter'
    );
    await expect(onboarding.locator('[data-i18n="onboardingPlaygroundCallout"]')).toHaveText(
      'This will take you to the Games lobby, where you can start a new game with a real player that also has the extension, or a Computer (bot) player.'
    );
    await expect(onboarding.locator('#previewPlaygroundCallout .preview-callout-link')).toHaveText(
      'Learn more'
    );
    await expect(
      onboarding.locator('#previewPlaygroundCallout .preview-callout-link')
    ).toHaveAttribute('href', 'https://www.chatenhancer.com/playground/');
    await expect(
      onboarding.locator('#previewPlaygroundCallout .preview-callout-link')
    ).toHaveAttribute('target', '_blank');
    await expect
      .poll(() =>
        onboarding.locator('#chatPreview').evaluate((preview) => {
          const header = preview.querySelector<HTMLElement>('.preview-chat-header');
          const composer = preview.querySelector<HTMLElement>('.preview-composer');
          const liteCard = preview.querySelector<HTMLElement>('#previewLiteCallout');
          const playgroundCard = preview.querySelector<HTMLElement>('#previewPlaygroundCallout');
          if (!header || !composer || !liteCard || !playgroundCard) return false;

          const headerBounds = header.getBoundingClientRect();
          const composerBounds = composer.getBoundingClientRect();
          const liteBounds = liteCard.getBoundingClientRect();
          const playgroundBounds = playgroundCard.getBoundingClientRect();
          return (
            liteBounds.top >= headerBounds.bottom + 20 &&
            playgroundBounds.top >= liteBounds.bottom + 40 &&
            playgroundBounds.bottom <= composerBounds.top - 20
          );
        })
      )
      .toBe(true);
    await expect
      .poll(() =>
        onboarding.locator('#chatPreview').evaluate((preview) => {
          const rootBounds = preview.getBoundingClientRect();
          const connectors = [
            {
              card: preview.querySelector<HTMLElement>('#previewLiteCallout'),
              icon: preview.querySelector<HTMLElement>('#previewLiteIcon'),
              path: preview.querySelector<SVGPathElement>('#previewLiteCalloutConnector')
            },
            {
              card: preview.querySelector<HTMLElement>('#previewPlaygroundCallout'),
              icon: preview.querySelector<HTMLElement>('#previewGamesIcon'),
              path: preview.querySelector<SVGPathElement>('#previewPlaygroundCalloutConnector')
            }
          ];

          return connectors.every(({ card, icon, path }) => {
            if (!card || !icon || !path || !path.getTotalLength()) return false;
            const cardBounds = card.getBoundingClientRect();
            const iconBounds = icon.getBoundingClientRect();
            const pathStart = path.getPointAtLength(0);
            const pathEnd = path.getPointAtLength(path.getTotalLength());
            const cardIsOnLeft =
              cardBounds.left + cardBounds.width / 2 < rootBounds.left + rootBounds.width / 2;
            const expectedEndX =
              (cardIsOnLeft ? cardBounds.left : cardBounds.right) - rootBounds.left;
            const expectedEndY = cardBounds.top - rootBounds.top + cardBounds.height / 2;
            const expectedStartX = iconBounds.left - rootBounds.left + iconBounds.width / 2;
            const expectedStartY = iconBounds.bottom - rootBounds.top - 2;

            return (
              Math.abs(pathStart.x - expectedStartX) < 2 &&
              Math.abs(pathStart.y - expectedStartY) < 2 &&
              Math.abs(pathEnd.x - expectedEndX) < 2 &&
              Math.abs(pathEnd.y - expectedEndY) < 2 &&
              Number.parseFloat(getComputedStyle(path).opacity) > 0.7
            );
          });
        })
      )
      .toBe(true);
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute('data-chat-skin', 'aero');
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute('data-chat-theme', 'light');
    await expect(onboarding.locator('html')).toHaveAttribute('data-ytcq-chat-skin', 'aero');
    await expect(onboarding.locator('html')).toHaveAttribute('data-ytcq-chat-skin-theme', 'light');
    await expect(onboarding.locator('#chatPreview')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    );
    await expect(
      onboarding.locator('.preview-message yt-live-chat-author-chip + #message-container')
    ).toHaveCount(3);
    await expect
      .poll(() =>
        onboarding
          .locator('.preview-message-featured')
          .evaluate((message) => getComputedStyle(message).fontFamily)
      )
      .toContain('Tahoma');
    await expect
      .poll(() =>
        onboarding
          .locator('.preview-chat-header')
          .evaluate((header) => getComputedStyle(header).backgroundImage)
      )
      .toContain('data:image/png;base64');
    await expect(onboarding.locator('.preview-native-header-icon path').first()).toHaveCSS(
      'fill',
      'rgb(255, 255, 255)'
    );

    await onboarding.emulateMedia({ colorScheme: 'dark' });
    await expect(onboarding.locator('html')).toHaveCSS('color-scheme', 'dark');
    await expect(onboarding.locator('body')).toHaveCSS('background-color', 'rgb(40, 40, 40)');
    await expect(onboarding.locator('body')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(onboarding.locator('.settings-list > .setting-row').first()).toHaveCSS(
      'background-color',
      'rgba(255, 255, 255, 0.08)'
    );
    await expect(onboarding.locator('#onboardingChatSkin')).toHaveCSS(
      'background-color',
      'rgb(53, 53, 53)'
    );
    await expect
      .poll(() =>
        onboarding
          .locator('.onboarding-brand img')
          .evaluate((image) => getComputedStyle(image).content)
      )
      .toContain('logo-white.png');
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute('data-chat-theme', 'dark');
    await expect(onboarding.locator('html')).toHaveAttribute('data-ytcq-chat-skin-theme', 'dark');
    await expect(onboarding.locator('#chatPreview')).toHaveCSS(
      'background-color',
      'rgb(8, 19, 31)'
    );
    await expect(onboarding.locator('#chatPreview')).toHaveCSS(
      'border-top-color',
      'rgb(46, 97, 128)'
    );
    await expect(onboarding.locator('.preview-chat-header')).toHaveCSS(
      'border-bottom-color',
      'rgb(46, 97, 128)'
    );
    await expect(onboarding.locator('.preview-chat-header')).not.toHaveCSS('box-shadow', 'none');
    await expect(onboarding.locator('.preview-chat-header')).toHaveCSS('z-index', '4');
    await expect(onboarding.locator('.preview-chat-feed')).toHaveCSS('z-index', '1');
    await expect(onboarding.locator('.preview-composer')).toHaveCSS(
      'border-top-color',
      'rgb(46, 97, 128)'
    );
    await onboarding.locator('.preview-composer-field').hover();
    await expect
      .poll(() =>
        onboarding
          .locator('.preview-composer-field')
          .evaluate((field) => getComputedStyle(field, '::before').borderTopColor)
      )
      .toBe('rgb(85, 169, 207)');
    await expect
      .poll(() =>
        onboarding
          .locator('.preview-skeleton-row')
          .first()
          .evaluate((row) => getComputedStyle(row, '::before').filter)
      )
      .toBe('none');
    await expect(onboarding.locator('.preview-native-header-icon path').first()).toHaveCSS(
      'fill',
      'rgb(255, 255, 255)'
    );
    await expect(onboarding.locator('.preview-send button')).toHaveCSS('background-image', 'none');
    await expect(onboarding.locator('.preview-send button')).toHaveCSS('box-shadow', 'none');
    await expect(onboarding.locator('.preview-send button')).toHaveCSS('border-top-width', '0px');
    await expect(onboarding.locator('.preview-send button')).toHaveCSS(
      'color',
      'rgb(185, 234, 246)'
    );
    await expectStoredOnboardingOptions(context);
  });
};

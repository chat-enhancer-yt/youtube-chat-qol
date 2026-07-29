/**
 * First-install onboarding browser scenario.
 *
 * Exercises the built extension page so its controls, storage writes, and live
 * preview stay aligned with the popup's shared option contract.
 */
import { expect, type Page } from '@playwright/test';
import { getExtensionId } from '../support/extension';
import {
  getExtensionStorageValues,
  withExtensionStorageValues
} from '../support/extension-storage';
import { withMockedTranslationEndpoint } from '../support/translation-endpoint';
import type { BrowserScenario } from './types';

const INITIAL_OPTIONS = {
  chatSkin: 'system',
  lastTranslationTarget: 'en',
  liteModeEnabled: false,
  playgroundEnabled: false,
  targetLanguage: '',
  translationDisplay: 'replace'
};

export const onboardingPreviewScenario: BrowserScenario = async ({ context }) => {
  await withExtensionStorageValues(context, 'sync', INITIAL_OPTIONS, async () => {
    await withMockedTranslationEndpoint(context, '今はうまく機能しているようです', async () => {
      const onboarding = await context.newPage();
      try {
        const extensionId = await getExtensionId(context);
        await onboarding.setViewportSize({ height: 720, width: 1280 });
        await onboarding.emulateMedia({ colorScheme: 'light' });
        await onboarding.goto(`chrome-extension://${extensionId}/onboarding.html`);

        await expect(onboarding.locator('link[href="content.css"]')).toHaveCount(1);
        await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute(
          'href',
          'https://www.chatenhancer.com/'
        );
        await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute(
          'target',
          '_blank'
        );
        await expect(onboarding.locator('.onboarding-brand')).toHaveAttribute(
          'aria-label',
          'Chat Enhancer for YouTube'
        );
        await expect(onboarding.locator('.onboarding-brand img')).toHaveAttribute(
          'src',
          'logo.png'
        );
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
        await expect(
          onboarding.locator('.setting-row-toggle .option-beta-badge')
        ).toHaveCount(2);
        await expect
          .poll(() =>
            onboarding
              .locator('.setting-row-toggle .option-beta-badge')
              .evaluateAll((badges) => badges.map((badge) => badge.textContent))
          )
          .toEqual(['Beta', 'Beta']);
        await expect(
          onboarding.locator('.setting-row-toggle .option-beta-badge').first()
        ).toHaveCSS('font-size', '9px');
        await expect(
          onboarding.locator('.setting-row-toggle .option-beta-badge').first()
        ).toHaveCSS('min-height', '13px');
        await expect(onboarding.locator('html')).toHaveCSS('color-scheme', 'light');
        await expect(onboarding.locator('body')).toHaveCSS(
          'background-color',
          'rgb(255, 255, 255)'
        );
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
        await expect(onboarding.locator('.settings-close-note')).toHaveCSS(
          'font-weight',
          '400'
        );
        await expect
          .poll(async () => {
            const [column, panel, note] = await Promise.all([
              onboarding.locator('.settings-column').boundingBox(),
              onboarding.locator('.settings-panel').boundingBox(),
              onboarding.locator('.settings-close-note').boundingBox()
            ]);
            if (!column || !panel || !note) return false;
            return (
              note.y >= panel.y + panel.height &&
              note.y + note.height <= column.y + column.height
            );
          })
          .toBe(true);
        await expect(onboarding.locator('.preview-hover-hint')).toHaveText(
          'Hover over icons for more information.'
        );
        await expect(onboarding.locator('.preview-hover-hint')).toHaveCSS(
          'color',
          'rgb(96, 96, 96)'
        );
        await expect(onboarding.locator('.preview-hover-hint')).toHaveCSS(
          'font-size',
          '13px'
        );
        await expect
          .poll(async () => {
            const [title, hint, preview] = await Promise.all([
              onboarding.locator('.preview-title').boundingBox(),
              onboarding.locator('.preview-hover-hint').boundingBox(),
              onboarding.locator('#chatPreview').boundingBox()
            ]);
            if (!title || !hint || !preview) return false;
            return (
              hint.y >= title.y + title.height &&
              hint.y + hint.height <= preview.y
            );
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
        await expect(onboarding.locator('#previewInboxTooltip')).toBeHidden();
        await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeHidden();
        await expect(onboarding.locator('#previewLiteIcon')).not.toHaveClass(/preview-icon-active/u);
        await expect(onboarding.locator('.preview-top-chat')).toHaveCSS('font-size', '16px');
        await expect(onboarding.locator('.preview-top-chat')).toHaveCSS('font-weight', '300');
        await expect
          .poll(() =>
            onboarding
              .locator('.onboarding-shell')
              .evaluate((shell) => getComputedStyle(shell).zoom)
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
            return Math.round(
              emoji.x + emoji.width / 2 - (translation.x + translation.width / 2)
            );
          })
          .toBe(34);
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

        await onboarding.locator('#previewInboxIcon').hover();
        await expect(onboarding.locator('#previewInboxTooltip')).toBeVisible();
        await expect(onboarding.locator('#previewInboxTooltip')).toHaveText(
          'This opens your Inbox. When people mention you in chat, their messages appear here so you don’t miss them. You can also set up custom Inbox keywords to watch for.'
        );
        await expect(onboarding.locator('#previewInboxTooltip')).toHaveCSS(
          'font-family',
          'Inter, Arial, sans-serif'
        );
        await expect(onboarding.locator('#previewInboxTooltip')).toHaveCSS(
          'pointer-events',
          'none'
        );
        await expect
          .poll(async () => {
            const [preview, header, tooltip] = await Promise.all([
              onboarding.locator('#chatPreview').boundingBox(),
              onboarding.locator('.preview-chat-header').boundingBox(),
              onboarding.locator('#previewInboxTooltip').boundingBox()
            ]);
            if (!preview || !header || !tooltip) return false;
            return (
              tooltip.y >= header.y + header.height &&
              tooltip.x >= preview.x &&
              tooltip.x + tooltip.width <= preview.x + preview.width
            );
          })
          .toBe(true);

        await onboarding.locator('#previewComposerTranslateIcon').hover();
        await expect(onboarding.locator('#previewInboxTooltip')).toBeHidden();
        await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeVisible();
        await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toHaveText(
          'This is the draft translator. Click it and choose a language to translate whatever you type in the chat box before you send it.'
        );
        await expect
          .poll(async () => {
            const [preview, composer, tooltip] = await Promise.all([
              onboarding.locator('#chatPreview').boundingBox(),
              onboarding.locator('.preview-composer').boundingBox(),
              onboarding.locator('#previewDraftTranslatorTooltip').boundingBox()
            ]);
            if (!preview || !composer || !tooltip) return false;
            return (
              tooltip.y + tooltip.height <= composer.y &&
              tooltip.x >= preview.x &&
              tooltip.x + tooltip.width <= preview.x + preview.width
            );
          })
          .toBe(true);
        await expect
          .poll(() =>
            onboarding.locator('#previewDraftTranslatorTooltip').evaluate((tooltip) => {
              const icon = document.querySelector<HTMLElement>(
                '#previewComposerTranslateIcon'
              );
              if (!icon) return Number.POSITIVE_INFINITY;

              const tooltipBounds = tooltip.getBoundingClientRect();
              const iconBounds = icon.getBoundingClientRect();
              const pointerStyle = getComputedStyle(tooltip, '::before');
              const pointerWidth = Number.parseFloat(pointerStyle.width);
              const pointerRight = Number.parseFloat(pointerStyle.right);
              const pointerCenter =
                tooltipBounds.right - pointerRight - pointerWidth / 2;
              const iconCenter = iconBounds.left + iconBounds.width / 2;
              return Math.abs(pointerCenter - iconCenter);
            })
          )
          .toBeLessThan(1);
        await onboarding.locator('.preview-title').hover();
        await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeHidden();

        await onboarding.locator('#onboardingTargetLanguage').selectOption('ja');
        await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeVisible();
        await expect(
          onboarding.locator('[data-i18n="onboardingTranslationDisplayHelper"]')
        ).toHaveText('Choose how translations are shown.');
        await expect(onboarding.locator('#previewInlineTranslateIcon')).toHaveCSS(
          'animation-name',
          'preview-icon-enter'
        );
        await expect(onboarding.locator('#previewPrimaryText')).toHaveText('今はうまく機能しているようです');
        await expect(onboarding.locator('#previewPrimaryText')).toHaveAttribute('lang', 'ja');
        await expect(onboarding.locator('.preview-message-featured #message')).toHaveCSS(
          'text-decoration-line',
          'underline'
        );
        await expect(onboarding.locator('.preview-inline-translation-tail')).toHaveCSS(
          'display',
          'inline'
        );
        await expect(onboarding.locator('.preview-message-featured .preview-author')).toHaveText(
          '@猫爪软乎乎'
        );
        await expect
          .poll(() =>
            onboarding.locator('#previewPrimaryText').evaluate(() => {
              const lead = document.querySelector<HTMLElement>('#previewPrimaryTextLead');
              const tail = document.querySelector<HTMLElement>('#previewPrimaryTextTail');
              const icon = document.querySelector<HTMLElement>(
                '#previewInlineTranslateIcon'
              );
              const leadText = lead?.firstChild;
              const tailText = tail?.firstChild;
              if (
                !(leadText instanceof Text) ||
                !leadText.length ||
                !(tailText instanceof Text) ||
                !tailText.length ||
                !icon
              ) {
                return Number.POSITIVE_INFINITY;
              }

              const finalLeadCharacter = document.createRange();
              finalLeadCharacter.setStart(leadText, leadText.length - 1);
              finalLeadCharacter.setEnd(leadText, leadText.length);
              const tailCharacter = document.createRange();
              tailCharacter.setStart(tailText, 0);
              tailCharacter.setEnd(tailText, 1);
              const leadBounds = finalLeadCharacter.getBoundingClientRect();
              const tailBounds = tailCharacter.getBoundingClientRect();
              const iconBounds = icon.getBoundingClientRect();
              return Math.max(
                Math.abs(leadBounds.top - tailBounds.top),
                Math.abs(tailBounds.top - iconBounds.top)
              );
            })
          )
          .toBeLessThan(8);

        await onboarding.locator('#onboardingTargetLanguage').selectOption('');
        await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeHidden();
        await onboarding.locator('#onboardingTargetLanguage').selectOption('ja');
        await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeVisible();

        await onboarding.locator('#onboardingTranslationDisplay').selectOption('below');
        await expect(onboarding.locator('#previewPrimaryText')).toHaveText('看来现在可以正常工作了');
        await expect(onboarding.locator('#previewTranslationPrefix')).toHaveText('Translated:');
        await expect(onboarding.locator('#previewSecondaryText')).toHaveText('今はうまく機能しているようです');
        await expect(onboarding.locator('#previewTranslationLine')).toBeVisible();

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
        await expect(onboarding.locator('#previewLiteCallout')).toHaveAttribute(
          'aria-hidden',
          'false'
        );
        await expect(onboarding.locator('#previewLiteCallout')).toHaveCSS(
          'animation-name',
          'preview-callout-enter'
        );
        await expect(
          onboarding.locator('#previewLiteCallout')
        ).toHaveText(
          'Lite mode, when enabled, will make live chat use less resources. You can always switch back to native by clicking this toggle.'
        );
        await expect(
          onboarding.locator('#previewLiteCallout .preview-callout-link')
        ).toHaveText('Lite mode');
        await expect(
          onboarding.locator('#previewLiteCallout .preview-callout-link')
        ).toHaveAttribute(
          'href',
          'https://www.chatenhancer.com/blog/introducing-lite-mode/'
        );
        await expect(
          onboarding.locator('#previewLiteCallout .preview-callout-link')
        ).toHaveAttribute('target', '_blank');
        await expect(
          onboarding.locator('#previewLiteCallout .preview-callout-link')
        ).toHaveCSS('pointer-events', 'auto');
        await expect(onboarding.locator('#chatPreview')).toHaveAttribute(
          'role',
          'group'
        );
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
        await expect(
          onboarding.locator('[data-i18n="onboardingPlaygroundCallout"]')
        ).toHaveText(
          'This will take you to the Games lobby, where you can start a new game with a real player that also has the extension, or a Computer (bot) player.'
        );
        await expect(
          onboarding.locator('#previewPlaygroundCallout .preview-callout-link')
        ).toHaveText('Learn more');
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
              const playgroundCard = preview.querySelector<HTMLElement>(
                '#previewPlaygroundCallout'
              );
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
                  path: preview.querySelector<SVGPathElement>(
                    '#previewLiteCalloutConnector'
                  )
                },
                {
                  card: preview.querySelector<HTMLElement>('#previewPlaygroundCallout'),
                  icon: preview.querySelector<HTMLElement>('#previewGamesIcon'),
                  path: preview.querySelector<SVGPathElement>(
                    '#previewPlaygroundCalloutConnector'
                  )
                }
              ];

              return connectors.every(({ card, icon, path }) => {
                if (!card || !icon || !path || !path.getTotalLength()) return false;
                const cardBounds = card.getBoundingClientRect();
                const iconBounds = icon.getBoundingClientRect();
                const pathStart = path.getPointAtLength(0);
                const pathEnd = path.getPointAtLength(path.getTotalLength());
                const cardIsOnLeft =
                  cardBounds.left + cardBounds.width / 2 <
                  rootBounds.left + rootBounds.width / 2;
                const expectedEndX =
                  (cardIsOnLeft ? cardBounds.left : cardBounds.right) - rootBounds.left;
                const expectedEndY =
                  cardBounds.top - rootBounds.top + cardBounds.height / 2;
                const expectedStartX =
                  iconBounds.left - rootBounds.left + iconBounds.width / 2;
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
        await expect(onboarding.locator('html')).toHaveAttribute(
          'data-ytcq-chat-skin-theme',
          'light'
        );
        await expect(onboarding.locator('#chatPreview')).toHaveCSS(
          'background-color',
          'rgb(255, 255, 255)'
        );
        await expect(
          onboarding.locator('.preview-message yt-live-chat-author-chip + #message-container')
        ).toHaveCount(3);
        await expect
          .poll(() =>
            onboarding.locator('.preview-message-featured').evaluate((message) =>
              getComputedStyle(message).fontFamily
            )
          )
          .toContain('Tahoma');
        await expect
          .poll(() =>
            onboarding.locator('.preview-chat-header').evaluate((header) =>
              getComputedStyle(header).backgroundImage
            )
          )
          .toContain('data:image/png;base64');
        await expect(onboarding.locator('.preview-native-header-icon path').first()).toHaveCSS(
          'fill',
          'rgb(255, 255, 255)'
        );

        await onboarding.emulateMedia({ colorScheme: 'dark' });
        await expect(onboarding.locator('html')).toHaveCSS('color-scheme', 'dark');
        await expect(onboarding.locator('body')).toHaveCSS(
          'background-color',
          'rgb(40, 40, 40)'
        );
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
        await expect(onboarding.locator('html')).toHaveAttribute(
          'data-ytcq-chat-skin-theme',
          'dark'
        );
        await expect(onboarding.locator('#chatPreview')).toHaveCSS(
          'background-color',
          'rgb(8, 19, 31)'
        );
        await expect(onboarding.locator('#chatPreview')).toHaveCSS(
          'border-top-color',
          'rgb(58, 98, 112)'
        );
        await expect(onboarding.locator('.preview-chat-header')).toHaveCSS(
          'border-bottom-color',
          'rgb(58, 98, 112)'
        );
        await expect(onboarding.locator('.preview-chat-header')).not.toHaveCSS(
          'box-shadow',
          'none'
        );
        await expect(onboarding.locator('.preview-chat-header')).toHaveCSS('z-index', '4');
        await expect(onboarding.locator('.preview-chat-feed')).toHaveCSS('z-index', '1');
        await expect(onboarding.locator('.preview-composer')).toHaveCSS(
          'border-top-color',
          'rgb(58, 98, 112)'
        );
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
        await expect(onboarding.locator('.preview-send button')).toHaveCSS(
          'background-image',
          'none'
        );
        await expect(onboarding.locator('.preview-send button')).toHaveCSS(
          'box-shadow',
          'none'
        );
        await expect(onboarding.locator('.preview-send button')).toHaveCSS(
          'border-top-width',
          '0px'
        );
        await expect(onboarding.locator('.preview-send button')).toHaveCSS(
          'color',
          'rgb(185, 234, 246)'
        );
        await expectStoredOptions(onboarding, context);
      } finally {
        await onboarding.close();
      }
    }, 'zh-CN');
  });
};

async function expectStoredOptions(
  onboarding: Page,
  context: Parameters<BrowserScenario>[0]['context']
): Promise<void> {
  await expect.poll(async () => {
    const values = await getExtensionStorageValues(context, 'sync', [
      'chatSkin',
      'lastTranslationTarget',
      'liteModeEnabled',
      'playgroundEnabled',
      'targetLanguage',
      'translationDisplay'
    ]);
    return values;
  }).toEqual({
    chatSkin: 'aero',
    lastTranslationTarget: 'ja',
    liteModeEnabled: true,
    playgroundEnabled: true,
    targetLanguage: 'ja',
    translationDisplay: 'below'
  });

  await expect(onboarding).toHaveTitle('Welcome aboard!');
}

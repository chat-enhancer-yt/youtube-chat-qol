/** Translation-control coverage for the extension onboarding preview. */
import { expect } from '@playwright/test';
import type { ExtensionScenario } from '../types';
import { withOnboardingPage } from './fixture';

export const onboardingTranslationPreviewScenario: ExtensionScenario = async ({ context }) => {
  await withOnboardingPage(context, async (onboarding) => {
    await onboarding.locator('#onboardingTargetLanguage').selectOption('ja');
    await expect(onboarding.locator('#onboardingTranslationDisplayRow')).toBeVisible();
    await expect(onboarding.locator('[data-i18n="onboardingTranslationDisplayHelper"]')).toHaveText(
      'Choose how translations are shown.'
    );
    await expect(onboarding.locator('#previewInlineTranslateIcon')).toHaveCSS(
      'animation-name',
      'preview-icon-enter'
    );
    await expect(onboarding.locator('#previewInlineTranslateIcon')).toHaveCSS(
      'color',
      'rgb(62, 166, 255)'
    );
    await onboarding.locator('#previewInlineTranslateIcon').hover();
    await expect(onboarding.locator('#previewInlineTranslateIcon')).toHaveCSS(
      'color',
      'rgb(62, 166, 255)'
    );
    await expect(onboarding.locator('#previewPrimaryText')).toHaveText(
      '今はうまく機能しているようです'
    );
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
          const icon = document.querySelector<HTMLElement>('#previewInlineTranslateIcon');
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
    await expect(onboarding.locator('#previewSecondaryText')).toHaveText(
      '今はうまく機能しているようです'
    );
    await expect(onboarding.locator('#previewTranslationLine')).toBeVisible();
  });
};

/** Interactive tooltip coverage for the extension onboarding preview. */
import { expect } from '@playwright/test';
import type { ExtensionScenario } from '../types';
import { withOnboardingPage } from './fixture';

export const onboardingTooltipScenario: ExtensionScenario = async ({ context }) => {
  await withOnboardingPage(context, async (onboarding) => {
    await onboarding.locator('#previewLiteIcon').hover();
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute(
      'data-lite-mode-enabled',
      'false'
    );
    await expect(onboarding.locator('#previewLiteCallout')).toBeHidden();
    await expect(onboarding.locator('#previewLiteCalloutConnector')).toHaveCSS('opacity', '0');
    await expect(onboarding.locator('#previewLiteModeTooltip')).toBeVisible();
    await expect(onboarding.locator('#previewLiteModeTooltip')).not.toBeEmpty();
    await expect
      .poll(async () => {
        const [preview, header, tooltip] = await Promise.all([
          onboarding.locator('#chatPreview').boundingBox(),
          onboarding.locator('.preview-chat-header').boundingBox(),
          onboarding.locator('#previewLiteModeTooltip').boundingBox()
        ]);
        if (!preview || !header || !tooltip) return false;
        return (
          tooltip.y >= header.y + header.height &&
          tooltip.x >= preview.x &&
          tooltip.x + tooltip.width <= preview.x + preview.width
        );
      })
      .toBe(true);

    await onboarding.locator('#onboardingPlaygroundEnabled').check();
    await expect(onboarding.locator('#previewGamesIcon')).toBeVisible();
    await onboarding.locator('#previewLiteIcon').hover();
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute(
      'data-playground-enabled',
      'true'
    );

    await onboarding.locator('#previewInboxIcon').hover();
    await expect(onboarding.locator('#previewLiteModeTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewInboxTooltip')).toBeVisible();
    await expect(onboarding.locator('#previewInboxTooltip')).not.toBeEmpty();
    await expect(onboarding.locator('#previewInboxTooltip')).toHaveCSS('pointer-events', 'none');
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
    await expect(onboarding.locator('#previewDraftTranslatorTooltip')).not.toBeEmpty();
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

    await onboarding.locator('#emoji-picker-button').hover();
    await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toBeVisible();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).not.toBeEmpty();
    await expect
      .poll(async () => {
        const [preview, composer, tooltip] = await Promise.all([
          onboarding.locator('#chatPreview').boundingBox(),
          onboarding.locator('.preview-composer').boundingBox(),
          onboarding.locator('#previewEmojiPickerTooltip').boundingBox()
        ]);
        if (!preview || !composer || !tooltip) return false;
        return (
          tooltip.y + tooltip.height <= composer.y &&
          tooltip.x >= preview.x &&
          tooltip.x + tooltip.width <= preview.x + preview.width
        );
      })
      .toBe(true);
    await onboarding.locator('.preview-title').hover();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toBeHidden();
  });
};

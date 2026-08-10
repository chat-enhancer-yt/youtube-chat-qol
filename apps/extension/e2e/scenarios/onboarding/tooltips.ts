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
    await expect(onboarding.locator('#previewLiteModeTooltip')).toHaveText(
      'Lite mode, when enabled, will make live chat use less resources. You can always switch back to native by clicking this toggle.'
    );
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
    await expect
      .poll(() =>
        onboarding.locator('#previewLiteModeTooltip').evaluate((tooltip) => {
          const icon = document.querySelector<HTMLElement>('#previewLiteIcon');
          if (!icon) return Number.POSITIVE_INFINITY;

          const tooltipBounds = tooltip.getBoundingClientRect();
          const iconBounds = icon.getBoundingClientRect();
          const pointerStyle = getComputedStyle(tooltip, '::before');
          const pointerWidth = Number.parseFloat(pointerStyle.width);
          const pointerRight = Number.parseFloat(pointerStyle.right);
          const pointerCenter = tooltipBounds.right - pointerRight - pointerWidth / 2;
          const iconCenter = iconBounds.left + iconBounds.width / 2;
          return Math.abs(pointerCenter - iconCenter);
        })
      )
      .toBeLessThan(1);

    await onboarding.locator('#onboardingPlaygroundEnabled').check();
    await expect(onboarding.locator('#previewGamesIcon')).toBeVisible();
    await onboarding.locator('#previewLiteIcon').hover();
    await expect(onboarding.locator('#chatPreview')).toHaveAttribute(
      'data-playground-enabled',
      'true'
    );
    await expect
      .poll(() =>
        onboarding.locator('#previewLiteModeTooltip').evaluate((tooltip) => {
          const icon = document.querySelector<HTMLElement>('#previewLiteIcon');
          if (!icon) return Number.POSITIVE_INFINITY;

          const tooltipBounds = tooltip.getBoundingClientRect();
          const iconBounds = icon.getBoundingClientRect();
          const pointerStyle = getComputedStyle(tooltip, '::before');
          const pointerWidth = Number.parseFloat(pointerStyle.width);
          const pointerRight = Number.parseFloat(pointerStyle.right);
          const pointerCenter = tooltipBounds.right - pointerRight - pointerWidth / 2;
          const iconCenter = iconBounds.left + iconBounds.width / 2;
          return Math.abs(pointerCenter - iconCenter);
        })
      )
      .toBeLessThan(1);

    await onboarding.locator('#previewInboxIcon').hover();
    await expect(onboarding.locator('#previewLiteModeTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewInboxTooltip')).toBeVisible();
    await expect(onboarding.locator('#previewInboxTooltip')).toHaveText(
      'This opens your Inbox. When people mention you in chat, their messages appear here so you don’t miss them. You can also set up custom Inbox keywords to watch for.'
    );
    await expect(onboarding.locator('#previewInboxTooltip')).toHaveCSS(
      'font-family',
      'Inter, Arial, sans-serif'
    );
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
          const icon = document.querySelector<HTMLElement>('#previewComposerTranslateIcon');
          if (!icon) return Number.POSITIVE_INFINITY;

          const tooltipBounds = tooltip.getBoundingClientRect();
          const iconBounds = icon.getBoundingClientRect();
          const pointerStyle = getComputedStyle(tooltip, '::before');
          const pointerWidth = Number.parseFloat(pointerStyle.width);
          const pointerRight = Number.parseFloat(pointerStyle.right);
          const pointerCenter = tooltipBounds.right - pointerRight - pointerWidth / 2;
          const iconCenter = iconBounds.left + iconBounds.width / 2;
          return Math.abs(pointerCenter - iconCenter);
        })
      )
      .toBeLessThan(1);

    await onboarding.locator('#emoji-picker-button').hover();
    await expect(onboarding.locator('#previewDraftTranslatorTooltip')).toBeHidden();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toBeVisible();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toHaveText(
      'Hover over this emoji button and your most-used reactions appear above the message box. Click it to open YouTube’s full emoji picker.'
    );
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
    await expect
      .poll(() =>
        onboarding.locator('#previewEmojiPickerTooltip').evaluate((tooltip) => {
          const icon = document.querySelector<HTMLElement>('#emoji-picker-button');
          if (!icon) return Number.POSITIVE_INFINITY;

          const tooltipBounds = tooltip.getBoundingClientRect();
          const iconBounds = icon.getBoundingClientRect();
          const pointerStyle = getComputedStyle(tooltip, '::before');
          const pointerWidth = Number.parseFloat(pointerStyle.width);
          const pointerRight = Number.parseFloat(pointerStyle.right);
          const pointerCenter = tooltipBounds.right - pointerRight - pointerWidth / 2;
          const iconCenter = iconBounds.left + iconBounds.width / 2;
          return Math.abs(pointerCenter - iconCenter);
        })
      )
      .toBeLessThan(1);
    await onboarding.locator('.preview-title').hover();
    await expect(onboarding.locator('#previewEmojiPickerTooltip')).toBeHidden();
  });
};

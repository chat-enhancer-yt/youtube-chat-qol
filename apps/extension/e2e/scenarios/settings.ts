/**
 * Browser scenarios for extension settings behavior.
 *
 * These checks verify that the visible YouTube and popup controls persist the
 * shared option fields that feature modules consume.
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { getExtensionId } from '../support/extension';
import {
  getExtensionStorageValues,
  withExtensionStorageValues
} from '../support/extension-storage';
import { openSettingsMenu } from '../support/menu-openers';
import type { BrowserScenario, ChatSurface } from './types';

const SETTINGS_INITIAL_VALUES = {
  composerTranslateLanguage: '',
  targetLanguage: '',
  lastTranslationTarget: 'ja',
  translationDisplay: 'replace',
  liteModeEnabled: false,
  messageDensity: 'default',
  sound: false,
  startupEffect: true
};

export const settingsMenuBehaviorScenario: BrowserScenario = async ({ chat, context }) => {
  await withExtensionStorageValues(context, 'sync', SETTINGS_INITIAL_VALUES, async () => {
    const menu = await openSettingsMenu(chat);
    await toggleTranslationFromChatSettings({ context, menu });
    await toggleAlertSoundsFromChatSettings({ context, menu });
    await closeNativeMenu(chat);
  });
};

export const popupSettingsBehaviorScenario: BrowserScenario = async ({ context }) => {
  await withExtensionStorageValues(context, 'sync', SETTINGS_INITIAL_VALUES, async () => {
    const popup = await openExtensionPopup(context);

    try {
      await expectPopupOptionCopyGap(popup);
      await changePopupTranslationTarget({ context, popup });
      await changePopupTranslationDisplay({ context, popup });
      await changePopupMessageDensity({ context, popup });
      await changePopupLiteMode({ context, popup });
      await changePopupAlertSounds({ context, popup });
      await changePopupStartupEffect({ context, popup });
    } finally {
      await popup.close();
    }
  });
};

async function expectPopupOptionCopyGap(popup: Page): Promise<void> {
  await test.step('Keep option help text close to its title', async () => {
    await expect
      .poll(() =>
        popup.locator('.option-control').first().evaluate((option) => {
          const title = option.querySelector('.option-title')?.getBoundingClientRect();
          const helper = option.querySelector('.option-helper')?.getBoundingClientRect();
          return title && helper ? helper.top - title.bottom : null;
        })
      )
      .toBe(2);
  });
}

async function toggleTranslationFromChatSettings({
  context,
  menu
}: {
  context: BrowserContext;
  menu: Locator;
}): Promise<void> {
  const item = menu.locator('.ytcq-settings-item[data-ytcq-setting="targetLanguage"]').first();

  await test.step('Verify Translate starts off in chat settings', async () => {
    await expect(item).toHaveAttribute('aria-checked', 'false');
  });

  await test.step('Enable Translate from chat settings', async () => {
    await item.click();
    await expectStorageValue(context, 'targetLanguage', 'ja');
    await expectStorageValue(context, 'lastTranslationTarget', 'ja');
    await expect(item).toHaveAttribute('aria-checked', 'true');
  });

  await test.step('Disable Translate from chat settings', async () => {
    await item.click();
    await expectStorageValue(context, 'targetLanguage', '');
    await expect(item).toHaveAttribute('aria-checked', 'false');
  });
}

async function toggleAlertSoundsFromChatSettings({
  context,
  menu
}: {
  context: BrowserContext;
  menu: Locator;
}): Promise<void> {
  const item = menu.locator('.ytcq-settings-item[data-ytcq-setting="sound"]').first();

  await test.step('Verify alert sounds start off in chat settings', async () => {
    await expect(item).toHaveAttribute('aria-checked', 'false');
  });

  await test.step('Enable alert sounds from chat settings', async () => {
    await item.click();
    await expectStorageValue(context, 'sound', true);
    await expect(item).toHaveAttribute('aria-checked', 'true');
  });

  await test.step('Disable alert sounds from chat settings', async () => {
    await item.click();
    await expectStorageValue(context, 'sound', false);
    await expect(item).toHaveAttribute('aria-checked', 'false');
  });
}

async function changePopupTranslationTarget({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Set popup translation target', async () => {
    await expect(
      popup.locator('.option-control:has(#targetLanguage) .option-title > span:last-child')
    ).toHaveText('Chat translation');
    await popup.locator('#targetLanguage').selectOption('ja');
    await expectStorageValue(context, 'targetLanguage', 'ja');
    await expectStorageValue(context, 'lastTranslationTarget', 'ja');
  });
}

async function changePopupTranslationDisplay({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Set popup translation display mode', async () => {
    const icon = popup.locator('.translation-display-icon');
    await expect(
      popup.locator('.option-control:has(#translationDisplay) .option-title > span:last-child')
    ).toHaveText('Translation appearance');
    await expect(popup.locator('#translationDisplay option[value="replace"]')).toHaveText(
      'Replace text'
    );
    await expect(popup.locator('#translationDisplay')).toHaveCSS('width', '132px');
    await expect(icon.locator('.translation-display-message')).toHaveCount(2);
    await expect(icon.locator('.translation-display-flow')).toHaveCount(1);
    await popup.locator('#translationDisplay').selectOption('below');
    await expect(icon).toHaveClass(/ytcq-display-reflow/);
    await expect(icon.locator('.translation-display-message-translation')).toHaveCSS(
      'animation-name',
      'ytcq-display-translation-arrive'
    );
    await expectStorageValue(context, 'translationDisplay', 'below');
  });
}

async function changePopupLiteMode({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Enable Lite mode from the popup', async () => {
    await expect(
      popup.locator('section.settings-section:has(#liteModeEnabled) > h2')
    ).toHaveText('Performance');
    await expect(
      popup.locator('label:has(#liteModeEnabled) .option-beta-badge')
    ).toHaveText('Beta');
    await expect(popup.locator('label:has(#liteModeEnabled) .option-helper')).toHaveText(
      'Use a faster, lightweight chat feed to improve performance.'
    );
    await popup.locator('#liteModeEnabled').setChecked(true);
    await expectStorageValue(context, 'liteModeEnabled', true);
  });
}

async function changePopupMessageDensity({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Set message density directly below the theme control', async () => {
    const control = popup.locator(
      '.option-control:has(#chatSkin) + .option-control #messageDensity'
    );
    await expect(control).toBeVisible();
    await expect(popup.locator('#messageDensityLabel')).toHaveText('Message density');
    await expect(control.locator('option')).toHaveText(['Default', 'Compact']);
    await expect(popup.locator('.message-density-icon')).not.toHaveClass(/ytcq-density-compress/);
    await control.selectOption('compact');
    await expect(popup.locator('.message-density-icon')).toHaveClass(/ytcq-density-compress/);
    await expect(popup.locator('.message-density-line-top')).toHaveCSS(
      'animation-name',
      'ytcq-density-line-compress'
    );
    await expectStorageValue(context, 'messageDensity', 'compact');
  });
}

async function changePopupAlertSounds({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Set popup alert sounds option', async () => {
    await popup.locator('#sound').setChecked(true);
    await expectStorageValue(context, 'sound', true);
  });
}

async function changePopupStartupEffect({
  context,
  popup
}: {
  context: BrowserContext;
  popup: Page;
}): Promise<void> {
  await test.step('Set popup startup effect option', async () => {
    const group = popup.locator('#appearanceMoreSettingsGroup');
    const option = popup.locator('#startupEffectOption');
    const moreSettings = popup.locator('#appearanceMoreSettingsToggle');
    const control = popup.locator('#startupEffect');
    await expect(group).toBeHidden();
    await expect(moreSettings).toHaveText('Show more');
    await expect(moreSettings).toHaveAttribute('aria-expanded', 'false');
    await expect(moreSettings).toHaveAttribute('aria-controls', 'appearanceMoreSettingsGroup');
    await expectMoreSettingsChevronOffset(moreSettings, -1.5);
    await expect
      .poll(() =>
        moreSettings.evaluate((element) => {
          const styles = getComputedStyle(element);
          const playgroundIdentity = document.querySelector('.playground-profile');
          return {
            hasBackground: styles.backgroundColor !== 'rgba(0, 0, 0, 0)',
            matchesPlaygroundIdentityBackground:
              playgroundIdentity !== null &&
              styles.backgroundColor === getComputedStyle(playgroundIdentity).backgroundColor,
            borderStyle: styles.borderStyle,
            borderWidth: styles.borderWidth,
            boxShadow: styles.boxShadow,
            fontWeight: styles.fontWeight,
            outlineStyle: styles.outlineStyle
          };
        })
      )
      .toEqual({
        hasBackground: false,
        matchesPlaygroundIdentityBackground: false,
        borderStyle: 'none',
        borderWidth: '0px',
        boxShadow: 'none',
        fontWeight: '400',
        outlineStyle: 'none'
      });
    await expect
      .poll(async () => {
        const [buttonBounds, sectionBounds] = await Promise.all([
          moreSettings.boundingBox(),
          popup.locator('#appearanceSettingsSection').boundingBox()
        ]);
        if (!buttonBounds || !sectionBounds) return null;
        return {
          height: buttonBounds.height,
          isCentered:
            Math.abs(
              buttonBounds.x + buttonBounds.width / 2 -
                (sectionBounds.x + sectionBounds.width / 2)
            ) <= 1,
          isCompact: buttonBounds.width < sectionBounds.width / 2
        };
      })
      .toEqual({ height: 20, isCentered: true, isCompact: true });

    await option.evaluate((element) => {
      const captureRevealAnimation = (event: Event): void => {
        const animationEvent = event as AnimationEvent;
        if (animationEvent.animationName !== 'ytcq-popup-option-added') return;
        element.dataset.revealAnimation = animationEvent.animationName;
        element.dataset.revealAnimationDuration = getComputedStyle(element).animationDuration;
        element.removeEventListener('animationstart', captureRevealAnimation);
      };
      element.addEventListener('animationstart', captureRevealAnimation);
    });
    await moreSettings.click();
    await expect(moreSettings).toHaveAttribute('aria-expanded', 'true');
    await expect(moreSettings).toBeHidden();
    await expect(group).toBeVisible();
    await expect(option).toBeVisible();
    await expect(option).toHaveAttribute('data-reveal-animation', 'ytcq-popup-option-added');
    await expect(option).toHaveAttribute('data-reveal-animation-duration', '0.72s');
    await expect(group.locator(':scope > .appearance-more-settings-content')).toHaveCSS(
      'min-height',
      '0px'
    );
    await expect(group).toHaveCSS(
      'transition-property',
      'grid-template-rows, opacity, transform'
    );
    await expect
      .poll(async () => {
        const [panelBounds, sectionBounds] = await Promise.all([
          popup.locator('#settingsPanel').boundingBox(),
          popup.locator('#appearanceSettingsSection').boundingBox()
        ]);
        if (!panelBounds || !sectionBounds) return false;
        const panelBottom = panelBounds.y + panelBounds.height;
        const sectionBottom = sectionBounds.y + sectionBounds.height;
        return Math.abs(panelBottom - sectionBottom) <= 1 && sectionBounds.y >= panelBounds.y;
      })
      .toBe(true);

    if (!(await control.isDisabled())) {
      await control.setChecked(false);
      await expectStorageValue(context, 'startupEffect', false);
    }

    await popup.reload();
    await expect(group).toBeHidden();
    await expect(moreSettings).toBeVisible();
    await expect(moreSettings).toHaveAttribute('aria-expanded', 'false');
  });
}

async function expectMoreSettingsChevronOffset(
  toggle: Locator,
  expectedY: number
): Promise<void> {
  await expect
    .poll(() =>
      toggle.evaluate((element) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element, '::after').transform);
        return {
          x: Math.round(matrix.m41 * 10) / 10,
          y: Math.round(matrix.m42 * 10) / 10
        };
      })
    )
    .toEqual({ x: 0, y: expectedY });
}

async function openExtensionPopup(context: BrowserContext): Promise<Page> {
  return test.step('Open extension popup', async () => {
    const extensionId = await getExtensionId(context);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    const settingsTab = popup.locator('#settingsTab');
    await expect(settingsTab).toBeVisible({ timeout: 10_000 });
    await settingsTab.click();
    await expect(settingsTab).toHaveAttribute('aria-selected', 'true');
    return popup;
  });
}

async function expectStorageValue(
  context: BrowserContext,
  key: string,
  expectedValue: unknown
): Promise<void> {
  await expect.poll(async () => {
    const values = await getExtensionStorageValues(context, 'sync', [key]);
    return values[key];
  }, {
    message: `Expected extension sync storage ${key} to equal ${String(expectedValue)}.`,
    timeout: 5_000
  }).toEqual(expectedValue);
}

async function closeNativeMenu(chat: ChatSurface): Promise<void> {
  await test.step('Close chat settings menu', async () => {
    await chat.locator('body').press('Escape').catch(() => undefined);
  });
}

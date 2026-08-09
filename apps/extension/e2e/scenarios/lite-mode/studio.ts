/** YouTube Studio intentionally does not expose the Lite mode control. */
import { expect } from '@playwright/test';
import type { BrowserScenario } from '../types';

export const liteModeUnavailableInStudioScenario: BrowserScenario = async ({ chat }) => {
  await expect(chat.locator('.ytcq-lite-mode-button')).toHaveCount(0);
};

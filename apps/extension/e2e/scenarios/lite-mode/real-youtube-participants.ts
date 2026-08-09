/** Real YouTube participant-panel interactions and evidence. */
import type { Locator } from '@playwright/test';
import { openSettingsMenu } from '../../support/menu-openers';
import type { ChatSurface } from '../types';
import {
  getRealYouTubeSurfaceAudit,
  type RealYouTubeSurfaceAudit
} from './real-youtube-audit';

export interface ParticipantEvidence extends RealYouTubeSurfaceAudit {
  ariaHidden: string | null;
  batchCountBeforePanel: number;
  rowCount: number;
  selected: boolean;
  textLength: number;
  visibleRowCount: number;
}

export async function openParticipantsPanel(chat: ChatSurface): Promise<void> {
  const menu = await openSettingsMenu(chat);
  const candidates = menu.locator(
    [
      'ytd-menu-navigation-item-renderer',
      'ytd-menu-service-item-renderer',
      'yt-live-chat-menu-sub-menu-item-renderer',
      'tp-yt-paper-item'
    ].join(',')
  );
  for (let index = 0; index < (await candidates.count()); index += 1) {
    const candidate = candidates.nth(index);
    if (!/\bparticipants\b/i.test(await candidate.innerText().catch(() => ''))) continue;
    if (!(await candidate.isVisible().catch(() => false))) continue;
    await candidate.click();
    return;
  }
  throw new Error(
    `YouTube Participants item was not found. Menu text: ${(await menu.innerText()).slice(0, 500)}`
  );
}

export async function closeParticipantsPanel(
  chat: ChatSurface,
  participants: Locator
): Promise<void> {
  for (const selector of [
    '#close-button button',
    'button[aria-label*="Close" i]',
    'button[aria-label*="Back" i]',
    'yt-icon-button#close-button',
    'yt-icon-button#back-button',
    '#close-button',
    '#back-button'
  ]) {
    const candidate = participants.locator(selector).first();
    if (!(await candidate.isVisible({ timeout: 250 }).catch(() => false))) continue;
    await candidate.click();
    return;
  }
  await participants.press('Escape').catch(() => undefined);
  await chat.locator('body').press('Escape').catch(() => undefined);
}

export async function getParticipantRowCount(participants: Locator): Promise<number> {
  return participants.locator('yt-live-chat-participant-renderer').count();
}

export async function getParticipantEvidence(
  chat: ChatSurface,
  participants: Locator,
  batchCountBeforePanel: number
): Promise<ParticipantEvidence> {
  const panel = await participants.evaluate((element) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLElement>('yt-live-chat-participant-renderer')
    );
    return {
      ariaHidden: element.getAttribute('aria-hidden'),
      rowCount: rows.length,
      selected:
        element.classList.contains('iron-selected') ||
        element.hasAttribute('selected') ||
        element.getAttribute('aria-selected') === 'true',
      textLength: (element.textContent || '').trim().length,
      visibleRowCount: rows.filter((row) => {
        const style = getComputedStyle(row);
        const rect = row.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
      }).length
    };
  });
  return {
    ...(await getRealYouTubeSurfaceAudit(chat)),
    ...panel,
    batchCountBeforePanel
  };
}

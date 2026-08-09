/** Playground lobby and game interactions shared by browser scenarios. */
import { expect, test, type Locator } from '@playwright/test';
import { appendMockFixtureMessage } from '../../support/mock-page';
import { installMockPlaygroundBackend } from '../../support/playground-backend';
import type { ChatSurface } from '../types';

type MockPlaygroundBackend = Awaited<ReturnType<typeof installMockPlaygroundBackend>>;

export function getGameCard(card: Locator, label: string): Locator {
  return card.locator('.ytcq-games-game-card').filter({ hasText: label });
}

export async function openGamesCard(
  chat: ChatSurface,
  backend: MockPlaygroundBackend
): Promise<Locator> {
  const gamesButton = chat.locator('.ytcq-games-button');
  await expect(gamesButton).toBeVisible();

  await gamesButton.click();
  await backend.waitForClientMessage('hello');

  const card = chat.locator('.ytcq-games-card');
  await expect(card).toBeVisible();
  return card;
}

export async function openGamePlayerList(card: Locator, gameLabel: string): Promise<void> {
  await getGameCard(card, gameLabel).click();
  await expect(card.locator('.ytcq-profile-card-title')).toHaveText(gameLabel);
  await expect(card.locator('.ytcq-games-section-title')).toHaveText('Players');
  const detailActions = card.locator('.ytcq-games-detail-actions');
  const cancel = detailActions.getByRole('button', { name: 'Cancel' });
  await expect(detailActions).toHaveCSS('display', 'flex');
  await expect(detailActions).toHaveCSS('justify-content', 'flex-end');
  await expect(cancel).toBeVisible();
  await expect(cancel).toHaveClass(/ytcq-profile-card-open/);
}

export async function openGamePlayerListFromChat(
  chat: ChatSurface,
  backend: MockPlaygroundBackend,
  gameLabel: string
): Promise<Locator> {
  const card = await openGamesCard(chat, backend);
  await openGamePlayerList(card, gameLabel);
  return card;
}

export async function openBountyHuntingPlayerList(
  chat: ChatSurface,
  backend: MockPlaygroundBackend
): Promise<Locator> {
  return openGamePlayerListFromChat(chat, backend, 'The Wild Wild Chat');
}

export async function inviteBountyHuntingComputer(
  card: Locator,
  backend: MockPlaygroundBackend
): Promise<void> {
  await invitePlayer(card, 'Computer (Bounty Hunter)');
  const invite = await backend.waitForClientMessage('invite');
  expect(invite).toMatchObject({
    gameId: 'bounty-hunting',
    toUserId: 'server:computer:bounty-hunting'
  });
}

export async function appendRequiredMockFixtureMessage(
  chat: ChatSurface,
  message: {
    author: string;
    text: string;
  }
): Promise<string> {
  const messageId = await appendMockFixtureMessage(chat, message);
  if (!messageId) throw new Error('Could not append Bounty Hunting fixture message.');
  return messageId;
}

export async function dispatchMessageClick(message: Locator): Promise<void> {
  await message.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  });
}

export async function dispatchReplayTriviaAnswerKey(
  canvas: Locator,
  key: string
): Promise<void> {
  await canvas.evaluate((element, pressedKey) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: pressedKey
      })
    );
  }, key);
}

export async function invitePlayer(card: Locator, playerName: string): Promise<void> {
  await test.step(`Invite ${playerName}`, async () => {
    const player = card.locator('.ytcq-games-player-row').filter({ hasText: playerName });
    await player.getByRole('button', { name: 'Invite' }).click();
    await expect(player).toContainText('Waiting for reply...');
  });
}

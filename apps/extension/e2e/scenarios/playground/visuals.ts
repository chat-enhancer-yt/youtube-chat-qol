/** Geometry and rendered-treatment queries for Playground scenarios. */
import { expect, type Locator, type Page } from '@playwright/test';
import {
  STICK_AROUND_ARENA_HEIGHT,
  STICK_AROUND_ARENA_WIDTH
} from '@chatenhancer/playground-core/stick-around';
import type { ChatSurface } from '../types';

export async function isChatScrolledToBottom(chat: ChatSurface): Promise<boolean> {
  return chat
    .locator('#item-scroller')
    .evaluate(
      (scroller) =>
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
    );
}

export async function readButtonTreatment(button: Locator): Promise<{
  backgroundColor: string;
  backgroundImage: string;
  borderRadius: string;
  boxShadow: string;
  color: string;
}> {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      color: style.color
    };
  });
}

export interface SurfaceTreatment {
  backdropFilter: string;
  backgroundColor: string;
  backgroundImage: string;
  borderColor: string;
  borderRadius: string;
  boxShadow: string;
  color: string;
}

export async function readSurfaceTreatment(surface: Locator): Promise<SurfaceTreatment> {
  return surface.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backdropFilter: style.backdropFilter,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      color: style.color
    };
  });
}

export async function findStickAroundReadyHitboxPoint(
  page: Page,
  overlay: Locator,
  canvas: Locator
): Promise<{ x: number; y: number }> {
  const point = { x: 0, y: 0 };
  const candidateArenaY = [400, 300];

  await expect
    .poll(
      async () => {
        const box = await canvas.boundingBox();
        if (!box) return false;
        const viewportScale = Math.max(
          0.1,
          Math.min(
            1,
            box.width / STICK_AROUND_ARENA_WIDTH,
            box.height / STICK_AROUND_ARENA_HEIGHT
          )
        );
        const offsetX = (box.width - STICK_AROUND_ARENA_WIDTH * viewportScale) / 2;
        const offsetY = (box.height - STICK_AROUND_ARENA_HEIGHT * viewportScale) / 2;

        for (const arenaY of candidateArenaY) {
          point.x = box.x + offsetX + (STICK_AROUND_ARENA_WIDTH / 2) * viewportScale;
          point.y = box.y + offsetY + arenaY * viewportScale;
          await page.mouse.move(point.x, point.y);
          const cursor = await overlay.evaluate(
            (element) => (element as HTMLElement).style.cursor
          );
          if (cursor === 'pointer') return true;
        }

        return false;
      },
      {
        message: 'Expected Stick Around canvas Ready hitbox to respond to hover.',
        timeout: 10_000
      }
    )
    .toBe(true);

  return point;
}

export function getChessSquarePosition(square: string): { x: number; y: number } {
  const file = 'abcdefgh'.indexOf(square[0]);
  const rank = Number(square[1]);
  const tileSize = 224 / 8;
  return {
    x: file * tileSize + tileSize / 2,
    y: (8 - rank) * tileSize + tileSize / 2
  };
}

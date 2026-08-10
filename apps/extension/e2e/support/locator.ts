/**
 * Small Locator helpers for browser scenarios.
 *
 * Real YouTube chat can sit under sticky page chrome at some viewport sizes, so
 * scenarios center rows before user-like clicks instead of relying on
 * Playwright's nearest-edge auto-scroll.
 */
import { expect, type Locator } from '@playwright/test';

const OBSERVED_CLASS_ATTRIBUTE = 'data-ytcq-test-observed-class';
let nextClassObservationId = 0;

export async function centerLocatorInViewport(locator: Locator): Promise<void> {
  await locator
    .evaluate((element) => {
      element.scrollIntoView({
        block: 'center',
        inline: 'nearest'
      });
    })
    .catch(async () => {
      await locator.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => undefined);
    });
}

export async function clickLocatorAtCurrentCenter(locator: Locator): Promise<boolean> {
  const initialPoint = await getLocatorCenterInViewport(locator);
  if (!initialPoint) return false;

  await locator.page().mouse.move(initialPoint.x, initialPoint.y);
  await locator.page().waitForTimeout(75);

  const clickPoint = await getLocatorCenterInViewport(locator);
  if (!clickPoint) return false;

  await locator.page().mouse.click(clickPoint.x, clickPoint.y);
  return true;
}

export async function expectClassAddedDuringAction(
  locator: Locator,
  className: string,
  action: () => Promise<void>,
  timeout = 2_000
): Promise<void> {
  const observationId = `${Date.now()}-${nextClassObservationId += 1}`;
  await locator.evaluate((element, { attribute, expectedClass, id }) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Class observation requires an HTML element.');
    }
    if (element.classList.contains(expectedClass)) {
      throw new Error(`Expected ${expectedClass} to be absent before the action.`);
    }

    const observed = element as HTMLElement & {
      ytcqTestClassObserver?: MutationObserver;
    };
    observed.ytcqTestClassObserver?.disconnect();
    const observer = new MutationObserver(() => {
      if (!observed.classList.contains(expectedClass)) return;
      observed.setAttribute(attribute, id);
      observer.disconnect();
      delete observed.ytcqTestClassObserver;
    });
    observed.ytcqTestClassObserver = observer;
    observer.observe(observed, {
      attributeFilter: ['class'],
      attributes: true
    });
  }, {
    attribute: OBSERVED_CLASS_ATTRIBUTE,
    expectedClass: className,
    id: observationId
  });

  try {
    await action();
    await expect(locator).toHaveAttribute(
      OBSERVED_CLASS_ATTRIBUTE,
      observationId,
      { timeout }
    );
  } finally {
    await locator.evaluate((element, { attribute, id }) => {
      if (!(element instanceof HTMLElement)) return;
      const observed = element as HTMLElement & {
        ytcqTestClassObserver?: MutationObserver;
      };
      observed.ytcqTestClassObserver?.disconnect();
      delete observed.ytcqTestClassObserver;
      if (observed.getAttribute(attribute) === id) {
        observed.removeAttribute(attribute);
      }
    }, {
      attribute: OBSERVED_CLASS_ATTRIBUTE,
      id: observationId
    }).catch(() => undefined);
  }
}

async function getLocatorCenterInViewport(
  locator: Locator
): Promise<{ x: number; y: number } | null> {
  const box = await locator.boundingBox().catch(() => null);
  const page = locator.page();
  const viewport =
    page.viewportSize() ||
    (await page.evaluate(() => ({
      height: window.innerHeight,
      width: window.innerWidth
    })));
  if (!box || !viewport || box.width <= 0 || box.height <= 0) return null;

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) return null;

  return { x, y };
}

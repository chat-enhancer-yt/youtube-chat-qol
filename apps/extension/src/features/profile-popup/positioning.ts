/**
 * Profile card positioning.
 *
 * Places the recent-messages card near the clicked avatar or mention and
 * nudges it back into the visible chat viewport as content changes.
 */
export function positionProfileCard(
  card: HTMLElement,
  anchorRect: Pick<DOMRectReadOnly, 'left' | 'right' | 'top'>
): void {
  const cardRect = card.getBoundingClientRect();
  const anchorGap = 8;
  const width = cardRect.width;
  const height = cardRect.height;

  let left = anchorRect.right + anchorGap;
  if (left + width > window.innerWidth) {
    left = anchorRect.left - width - anchorGap;
  }

  let top = anchorRect.top;
  if (top + height > window.innerHeight) {
    top = window.innerHeight - height;
  }

  card.style.left = `${Math.max(0, Math.round(left))}px`;
  card.style.top = `${Math.max(0, Math.round(top))}px`;
}

export function keepProfileCardInViewport(card: HTMLElement): void {
  const rect = card.getBoundingClientRect();

  let left = rect.left;
  if (left + rect.width > window.innerWidth) {
    left -= left + rect.width - window.innerWidth;
  }
  if (left < 0) {
    left = 0;
  }

  let top = rect.top;
  if (top + rect.height > window.innerHeight) {
    top -= top + rect.height - window.innerHeight;
  }
  if (top < 0) {
    top = 0;
  }

  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

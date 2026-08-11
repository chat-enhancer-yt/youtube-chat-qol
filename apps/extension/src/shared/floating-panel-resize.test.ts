import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wireFloatingPanelResize } from './floating-panel-resize';

const DIRECTION_CASES = [
  { direction: 'top', dx: 0, dy: -50, height: 230, left: 200, top: 100, width: 300 },
  { direction: 'top-right', dx: 50, dy: -50, height: 230, left: 200, top: 100, width: 350 },
  { direction: 'right', dx: 50, dy: 0, height: 180, left: 200, top: 150, width: 350 },
  { direction: 'bottom-right', dx: 50, dy: 50, height: 230, left: 200, top: 150, width: 350 },
  { direction: 'bottom', dx: 0, dy: 50, height: 230, left: 200, top: 150, width: 300 },
  { direction: 'bottom-left', dx: -50, dy: 50, height: 230, left: 150, top: 150, width: 350 },
  { direction: 'left', dx: -50, dy: 0, height: 180, left: 150, top: 150, width: 350 },
  { direction: 'top-left', dx: -50, dy: -50, height: 230, left: 150, top: 100, width: 350 }
] as const;

describe('floating panel resize', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('resizes both dimensions and clamps them to configured aesthetic bounds', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    const controller = new AbortController();
    const panel = panelWithRect({ height: 180, left: 100, top: 20, width: 300 });
    document.body.append(panel);
    wireFloatingPanelResize({
      axis: 'both',
      maxHeight: 560,
      maxWidth: 520,
      minHeight: 140,
      minWidth: 'initial',
      panel,
      signal: controller.signal
    });

    expect(panel.querySelectorAll('.ytcq-panel-resize-handle')).toHaveLength(8);
    const handle = panel.querySelector<HTMLElement>('.ytcq-panel-resize-handle-bottom-right')!;

    handle.dispatchEvent(pointerEvent('pointerdown', 400, 200, 3));
    document.dispatchEvent(pointerEvent('pointermove', 2_000, 2_000, 3));

    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('20px');
    expect(panel.style.maxWidth).toBe('min(520px, 100vw)');
    expect(panel.style.maxHeight).toBe('min(560px, 100vh)');
    expect(panel.style.width).toBe('520px');
    expect(panel.style.height).toBe('560px');

    document.dispatchEvent(pointerEvent('pointermove', -1_000, -1_000, 3));
    expect(panel.style.width).toBe('300px');
    expect(panel.style.height).toBe('140px');
  });

  it.each(DIRECTION_CASES)('resizes from the $direction handle', ({
    direction,
    dx,
    dy,
    height,
    left,
    top,
    width
  }) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    const controller = new AbortController();
    const panel = panelWithRect({ height: 180, left: 200, top: 150, width: 300 });
    document.body.append(panel);
    wireFloatingPanelResize({
      axis: 'both',
      maxHeight: 560,
      maxWidth: 520,
      minHeight: 140,
      minWidth: 'initial',
      panel,
      signal: controller.signal
    });
    const handle = panel.querySelector<HTMLElement>(`.ytcq-panel-resize-handle-${direction}`)!;

    handle.dispatchEvent(pointerEvent('pointerdown', 350, 240, 7));
    document.dispatchEvent(pointerEvent('pointermove', 350 + dx, 240 + dy, 7));
    expect(panel.style.left).toBe(`${left}px`);
    expect(panel.style.top).toBe(`${top}px`);
    expect(panel.style.width).toBe(`${width}px`);
    expect(panel.style.height).toBe(`${height}px`);
  });

  it('resizes a bottom-docked panel upward without changing its width', () => {
    const controller = new AbortController();
    const panel = panelWithRect({ height: 240, left: 0, top: 160, width: 600 });
    document.body.append(panel);
    wireFloatingPanelResize({
      axis: 'height-from-top',
      minHeight: 160,
      panel,
      signal: controller.signal
    });

    expect(panel.querySelectorAll('.ytcq-panel-resize-handle')).toHaveLength(1);
    const handle = panel.querySelector<HTMLElement>('.ytcq-panel-resize-handle-top')!;

    handle.dispatchEvent(pointerEvent('pointerdown', 300, 160, 4));
    document.dispatchEvent(pointerEvent('pointermove', 300, -1_000, 4));
    expect(panel.style.height).toBe('400px');
    expect(panel.style.maxHeight).toBe('100vh');
    expect(panel.style.width).toBe('');

    document.dispatchEvent(pointerEvent('pointermove', 300, 1_000, 4));
    expect(panel.style.height).toBe('160px');
  });
});

function panelWithRect(rectangle: {
  height: number;
  left: number;
  top: number;
  width: number;
}): HTMLElement {
  const panel = document.createElement('section');
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
    bottom: rectangle.top + rectangle.height,
    height: rectangle.height,
    left: rectangle.left,
    right: rectangle.left + rectangle.width,
    top: rectangle.top,
    width: rectangle.width,
    x: rectangle.left,
    y: rectangle.top,
    toJSON: () => ({})
  } as DOMRect);
  return panel;
}

function pointerEvent(
  type: string,
  clientX: number,
  clientY: number,
  pointerId: number
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    pointerId: { value: pointerId }
  });
  return event;
}

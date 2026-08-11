/**
 * Pointer resize helpers for extension-owned floating and docked panels.
 */
import { anchorFloatingPanelAtPoint, anchorFloatingPanelAtRect } from './floating-panel-drag';

type ResizeDirection =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left';
type ResizeWidthMinimum = number | 'initial';

interface FloatingPanelResizeOptions {
  axis: 'both' | 'height-from-top';
  maxHeight?: number;
  maxWidth?: number;
  minHeight: number;
  minWidth?: ResizeWidthMinimum;
  onResize?: () => void;
  onResizeStart?: () => void;
  panel: HTMLElement;
  signal: AbortSignal;
}

interface ResizeSession {
  bottom: number;
  direction: ResizeDirection;
  handle: HTMLElement;
  height: number;
  left: number;
  maxHeight: number;
  maxWidth: number;
  minHeight: number;
  minWidth: number;
  pointerId: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

const BOTH_AXIS_DIRECTIONS: readonly ResizeDirection[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-right',
  'bottom-right',
  'bottom-left',
  'top-left'
];

export function wireFloatingPanelResize({
  axis,
  maxHeight = Number.POSITIVE_INFINITY,
  maxWidth = Number.POSITIVE_INFINITY,
  minHeight,
  minWidth = 0,
  onResize,
  onResizeStart,
  panel,
  signal
}: FloatingPanelResizeOptions): void {
  panel.classList.add(`ytcq-panel-resizable-${axis}`);
  const initialRect = minWidth === 'initial' ? panel.getBoundingClientRect() : null;
  let initialWidth = initialRect?.width || 0;

  let session: ResizeSession | null = null;
  const directions = axis === 'both' ? BOTH_AXIS_DIRECTIONS : ['top'] as const;
  directions.forEach((direction) => {
    const handle = document.createElement('div');
    handle.className = `ytcq-panel-resize-handle ytcq-panel-resize-handle-${direction}`;
    if (axis === 'height-from-top') {
      handle.classList.add('ytcq-panel-resize-handle-height-from-top');
    }
    handle.setAttribute('aria-hidden', 'true');
    panel.append(handle);

    handle.addEventListener('pointerdown', (event) => {
      const button = 'button' in event ? event.button : 0;
      if (button !== 0) return;

      const rect = panel.getBoundingClientRect();
      if (minWidth === 'initial' && initialWidth <= 0) initialWidth = rect.width;
      if (axis === 'both') anchorFloatingPanelAtRect(panel, rect);

      const resizesLeft = direction.includes('left');
      const resizesRight = direction.includes('right');
      const resizesTop = direction.includes('top');
      const resizesBottom = direction.includes('bottom');
      const availableWidth = resizesLeft
        ? Math.max(0, rect.right)
        : resizesRight
          ? Math.max(0, window.innerWidth - rect.left)
          : rect.width;
      const availableHeight = resizesTop
        ? Math.max(0, rect.bottom)
        : resizesBottom
          ? Math.max(0, window.innerHeight - rect.top)
          : rect.height;
      const resolvedMaxWidth = Math.min(maxWidth, availableWidth);
      const resolvedMaxHeight = Math.min(maxHeight, availableHeight);
      const resolvedMinWidth = minWidth === 'initial' ? initialWidth : minWidth;
      session = {
        bottom: rect.bottom,
        direction,
        handle,
        height: rect.height,
        left: rect.left,
        maxHeight: resolvedMaxHeight,
        maxWidth: resolvedMaxWidth,
        minHeight: Math.min(minHeight, resolvedMaxHeight),
        minWidth: Math.min(resolvedMinWidth, resolvedMaxWidth),
        pointerId: event.pointerId,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        x: event.clientX,
        y: event.clientY
      };
      panel.dataset.ytcqPanelResized = 'true';
      panel.style.maxHeight = Number.isFinite(maxHeight)
        ? `min(${maxHeight}px, 100vh)`
        : '100vh';
      panel.style.height = `${Math.round(rect.height)}px`;
      if (axis === 'both') {
        panel.style.maxWidth = Number.isFinite(maxWidth)
          ? `min(${maxWidth}px, 100vw)`
          : '100vw';
        panel.style.width = `${Math.round(rect.width)}px`;
      }
      panel.classList.add('ytcq-panel-resizing');
      onResizeStart?.();
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }, { signal });
  });

  document.addEventListener('pointermove', (event) => {
    if (!session || event.pointerId !== session.pointerId) return;

    const deltaX = event.clientX - session.x;
    const deltaY = event.clientY - session.y;
    const resizesLeft = session.direction.includes('left');
    const resizesRight = session.direction.includes('right');
    const resizesTop = session.direction.includes('top');
    const resizesBottom = session.direction.includes('bottom');
    const width = resizesLeft
      ? clampNumber(session.width - deltaX, session.minWidth, session.maxWidth)
      : resizesRight
        ? clampNumber(session.width + deltaX, session.minWidth, session.maxWidth)
        : session.width;
    const height = resizesTop
      ? clampNumber(session.height - deltaY, session.minHeight, session.maxHeight)
      : resizesBottom
        ? clampNumber(session.height + deltaY, session.minHeight, session.maxHeight)
        : session.height;
    const left = resizesLeft ? session.right - width : session.left;
    const top = resizesTop ? session.bottom - height : session.top;

    panel.style.height = `${Math.round(height)}px`;
    if (axis === 'both') {
      panel.style.width = `${Math.round(width)}px`;
      anchorFloatingPanelAtPoint(panel, left, top);
    }
    onResize?.();
    event.preventDefault();
  }, { signal });

  const stopResize = (event: PointerEvent): void => {
    if (!session || event.pointerId !== session.pointerId) return;

    const completedSession = session;
    session = null;
    panel.classList.remove('ytcq-panel-resizing');
    if (completedSession.handle.hasPointerCapture?.(event.pointerId)) {
      completedSession.handle.releasePointerCapture(event.pointerId);
    }
  };
  document.addEventListener('pointerup', stopResize, { signal });
  document.addEventListener('pointercancel', stopResize, { signal });
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

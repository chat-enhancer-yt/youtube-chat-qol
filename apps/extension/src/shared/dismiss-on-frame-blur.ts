/**
 * Dismisses extension UI when focus leaves YouTube's chat iframe.
 *
 * A click on the surrounding watch page cannot reach document listeners inside
 * the iframe, but it does blur the iframe window before YouTube handles the
 * outer click. Treat that boundary like the outside-click behavior of YouTube's
 * native chat panels.
 */
export function dismissOnFrameBlur(dismiss: () => void, signal: AbortSignal): void {
  window.addEventListener('blur', () => dismiss(), { signal });
}

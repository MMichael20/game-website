// src/ui/errorBoundary.ts
// Last-resort crash UI. Catches uncaught runtime errors — typically a scene
// throwing from create() or an async task rejecting unhandled — and shows
// the player a simple "something broke, reload?" overlay instead of leaving
// the tab frozen on a half-rendered canvas.
//
// The original error is still logged to the console so dev tools surface
// the stack. This is a safety net, not a debugger.

let overlayShown = false;

function showCrashOverlay(message: string): void {
  if (overlayShown) return;
  overlayShown = true;

  const overlay = document.createElement('div');
  overlay.setAttribute('data-role', 'crash-overlay');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(26, 26, 46, 0.92); color: #fdf6e3;
    font-family: system-ui, sans-serif; padding: 24px;
    backdrop-filter: blur(6px);
  `;

  const title = document.createElement('div');
  title.textContent = 'Something broke.';
  title.style.cssText = 'font-size: 20px; font-weight: 600; margin-bottom: 8px;';

  const detail = document.createElement('div');
  detail.textContent = message;
  detail.style.cssText =
    'font-size: 13px; opacity: 0.75; margin-bottom: 20px; max-width: 480px; text-align: center;';

  const button = document.createElement('button');
  button.textContent = 'Reload';
  button.style.cssText = `
    padding: 10px 24px; font-size: 15px; border: none; cursor: pointer;
    background: #d4a574; color: #1a1a2e; border-radius: 6px;
    font-weight: 600;
  `;
  button.addEventListener('click', () => {
    window.location.reload();
  });

  overlay.append(title, detail, button);
  document.body.appendChild(overlay);
}

function normalizeMessage(err: unknown): string {
  if (err instanceof Error) return err.message || 'Unknown error';
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * Installs window-level error handlers. Call once at app boot. Safe to call
 * multiple times (idempotent). Does not swallow errors — they still propagate
 * to the console.
 */
export function installErrorBoundary(): void {
  window.addEventListener('error', (ev) => {
    console.error('[errorBoundary] uncaught error:', ev.error ?? ev.message);
    showCrashOverlay(normalizeMessage(ev.error ?? ev.message));
  });

  window.addEventListener('unhandledrejection', (ev) => {
    console.error('[errorBoundary] unhandled rejection:', ev.reason);
    showCrashOverlay(normalizeMessage(ev.reason));
  });
}

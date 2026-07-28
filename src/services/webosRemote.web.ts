/**
 * LG webOS remote-control support (web build only).
 *
 * Android TV gives D-pad focus movement for free — the platform walks the view
 * tree. A browser does not: webOS delivers the remote's arrow keys as plain
 * keydown events and nothing moves focus. This module supplies the missing
 * piece, so the `focusable` + `useTVFocus` rings the screens already use behave
 * the same on both platforms.
 *
 * Handled keys:
 *   37/38/39/40  arrows  -> spatial focus move
 *   13           OK      -> left to the browser (activates the focused element)
 *   461          Back    -> pop one screen; falls through to close the app
 *
 * Call `installWebOSRemote()` once at startup; it is a no-op off the web.
 */
import {goBackIfPossible} from '../navigation/navigationRef';
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
/** webOS remote's Back button. Not a standard DOM keycode. */
const KEY_BACK = 461;

type Direction = 'left' | 'up' | 'right' | 'down';

const FOCUSABLE_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
].join(',');

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  // Off-screen elements belong to inactive navigation screens.
  if (rect.bottom < 0 || rect.right < 0) {
    return false;
  }
  if (rect.top > window.innerHeight || rect.left > window.innerWidth) {
    return false;
  }
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

function candidates(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function centre(el: Element): {x: number; y: number} {
  const r = el.getBoundingClientRect();
  return {x: r.left + r.width / 2, y: r.top + r.height / 2};
}

/**
 * Nearest focusable in `direction`.
 *
 * Scores by distance along the travel axis plus a heavily weighted off-axis
 * penalty, so movement prefers the element straight ahead over a closer one
 * far off to the side — which is what a D-pad user expects from a grid.
 */
function nextInDirection(from: HTMLElement, direction: Direction): HTMLElement | null {
  const origin = centre(from);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates()) {
    if (el === from) {
      continue;
    }
    const target = centre(el);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;

    let along: number;
    let across: number;
    switch (direction) {
      case 'left':
        along = -dx;
        across = Math.abs(dy);
        break;
      case 'right':
        along = dx;
        across = Math.abs(dy);
        break;
      case 'up':
        along = -dy;
        across = Math.abs(dx);
        break;
      default:
        along = dy;
        across = Math.abs(dx);
    }

    // Must actually lie in the requested direction (small epsilon for rounding).
    if (along <= 1) {
      continue;
    }

    const score = along + across * 3;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

function directionFor(keyCode: number): Direction | null {
  switch (keyCode) {
    case KEY_LEFT:
      return 'left';
    case KEY_UP:
      return 'up';
    case KEY_RIGHT:
      return 'right';
    case KEY_DOWN:
      return 'down';
    default:
      return null;
  }
}

/** Text fields own their arrow keys (caret movement) — never steal those. */
function isTextEntry(el: Element | null): boolean {
  if (!el) {
    return false;
  }
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (tag !== 'INPUT') {
    return false;
  }
  const type = (el as HTMLInputElement).type;
  return type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio';
}

let installed = false;

export function installWebOSRemote(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  installed = true;

  document.addEventListener(
    'keydown',
    event => {
      if (event.keyCode === KEY_BACK) {
        // React Navigation is not wired to browser history here (no `linking`
        // config — a TV app has no URLs), so history.back() would exit the app
        // from any screen. Pop the navigator instead, and only let the press
        // through when we are already at the root, which closes the app —
        // exactly what LG expects from Back.
        if (goBackIfPossible()) {
          event.preventDefault();
        }
      }

      const direction = directionFor(event.keyCode);
      if (!direction) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (isTextEntry(active)) {
        return;
      }

      // Nothing focused yet (fresh screen) — seed focus at the first element.
      if (!active || active === document.body) {
        candidates()[0]?.focus();
        event.preventDefault();
        return;
      }

      const next = nextInDirection(active, direction);
      if (next) {
        event.preventDefault();
        next.focus();
        // Keep the highlight on screen inside long scrollers.
        next.scrollIntoView({block: 'nearest', inline: 'nearest'});
      }
    },
    true,
  );
}

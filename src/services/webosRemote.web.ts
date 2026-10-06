/**
 * TV remote-control support for the web builds: LG webOS and Samsung Tizen.
 *
 * Android TV gives D-pad focus movement for free — the platform walks the view
 * tree. A browser does not: webOS and Tizen deliver the remote's arrow keys as
 * plain keydown events and nothing moves focus. This module supplies the
 * missing piece, so the `focusable` + `useTVFocus` rings the screens already
 * use behave the same on every platform.
 *
 * Handled keys:
 *   37/38/39/40  arrows  -> spatial focus move
 *   13           OK      -> left to the browser (activates the focused element)
 *   461 / 10009  Back    -> pop one screen. At the root: webOS closes the app;
 *                           Tizen swallows it (see the keydown handler).
 *
 * Arrows, OK and Back reach a Tizen web app without `tvinputdevice.registerKey`;
 * only media / colour keys need registering.
 *
 * Call `installWebOSRemote()` once at startup; it is a no-op off the web.
 */
import {goBackIfPossible, navigationRef} from '../navigation/navigationRef';
import {IS_TIZEN} from '../utils/responsive';
import {closeTopModal, topModalRootId} from './modalRegistry';
const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
/** webOS remote's Back button. Not a standard DOM keycode. */
const KEY_BACK_WEBOS = 461;
/** Samsung Tizen remote's Back button ("Return"). */
const KEY_BACK_TIZEN = 10009;

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
  // While a modal (dialog / bottom sheet) is open, spatial nav must not walk
  // focus to elements behind it — RNW's Modal only brackets Tab focus, not our
  // synthetic arrow moves. Scope the candidate set to the modal's subtree.
  const modalId = topModalRootId();
  const root = (modalId && document.getElementById(modalId)) || document;
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
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

/**
 * Text fields own the arrow keys that move a caret. For a single-line <input>
 * that is ONLY left/right — up/down do nothing to the caret, so those escape
 * to spatial nav (otherwise the D-pad gets trapped in the search/coupon boxes
 * with no way out but Back). TEXTAREA/SELECT keep all four.
 */
function isTextEntry(el: Element | null, direction: Direction): boolean {
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
  // Segmented pickers step their value with up/down — keep ALL arrows there.
  if (
    type === 'date' ||
    type === 'time' ||
    type === 'datetime-local' ||
    type === 'month' ||
    type === 'week' ||
    type === 'number'
  ) {
    return true;
  }
  const isText =
    type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio';
  return isText && (direction === 'left' || direction === 'right');
}

/**
 * Put the highlight somewhere sensible when a new screen appears.
 *
 * Without this the first arrow press after navigating lands on whatever
 * `candidates()` happens to return first, so the guest presses a direction and
 * the highlight appears somewhere unrelated. Seeding on arrival means there is
 * always a visible starting point — normally the back button or the first
 * control in the header.
 *
 * Only seeds when nothing useful is focused: if the previous screen's element
 * was removed, `document.activeElement` falls back to <body>. An element that
 * survived the transition (a modal's button) is left alone.
 */
function seedFocus(): void {
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && isVisible(active)) {
    return;
  }
  candidates()[0]?.focus();
}

let installed = false;

export function installWebOSRemote(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  installed = true;

  // React Navigation renders the new screen during the state change; wait two
  // frames so the DOM is painted and off-screen siblings have been laid out
  // (isVisible filters on geometry, which is zero until then).
  navigationRef.addListener('state', () => {
    requestAnimationFrame(() => requestAnimationFrame(seedFocus));
  });

  document.addEventListener(
    'keydown',
    event => {
      if (event.keyCode === KEY_BACK_WEBOS || event.keyCode === KEY_BACK_TIZEN) {
        // Priority 1: close the top-most open modal (dialog / payment sheet).
        // Priority 2: pop the navigator (React Navigation is not wired to
        // browser history — history.back() would exit the app from anywhere).
        // At the root with nothing open:
        //  - webOS: let the press through; webOS closes the app, which is what
        //    LG expects from Back.
        //  - Tizen: swallow it. In a hotel the app IS the TV's home screen, so
        //    Back at the root must not leave it.
        if (closeTopModal() || goBackIfPossible() || IS_TIZEN) {
          event.preventDefault();
        }
      }

      const direction = directionFor(event.keyCode);
      if (!direction) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (isTextEntry(active, direction)) {
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

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
 *   461 / 10009  Back    -> pop one screen. At the root: webOS platformBack()
 *                           (exit popup / Home); Tizen swallows it (see the
 *                           keydown handler).
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
const KEY_OK = 13;
/** webOS remote's Back button. Not a standard DOM keycode. */
const KEY_BACK_WEBOS = 461;
/** Samsung Tizen remote's Back button ("Return"). */
const KEY_BACK_TIZEN = 10009;

/**
 * webOSTV.js's `webOS.platformBack()`, without bundling the library — it only
 * forwards to the WebAppManager bridge, exactly like this.
 */
function platformBack(): void {
  const palm = (window as unknown as {PalmSystem?: {platformBack?: () => void}}).PalmSystem;
  if (palm && palm.platformBack) {
    palm.platformBack();
  }
}

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
  // The screen underneath the current one stays mounted with its full on-screen
  // geometry; React Navigation only marks it aria-hidden (its buttons inherit
  // pointer-events: none). Without this check the D-pad walks onto buttons the
  // guest cannot see — and OK would press them (a curtain, DND) from the Cart.
  if (el.closest('[aria-hidden="true"]')) {
    return false;
  }
  const style = window.getComputedStyle(el);
  return (
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0' &&
    style.pointerEvents !== 'none'
  );
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

/** `TvBackButton`'s label — the first control of every TV screen's own panel. */
const SCREEN_BACK_LABEL = 'Back';

/**
 * Where the guest left from on each screen they navigated away from, newest
 * last, so Back can put the highlight on the tile that opened the screen
 * instead of the top of the page. Bounded: a stale entry is simply skipped.
 */
const returnTo: HTMLElement[] = [];
const RETURN_DEPTH = 10;

/**
 * The screen's first real control. The shared TV header (View Bill, Netflix,
 * Cart…) comes first in DOM order on every screen, then the screen's own Back
 * button, then its content — so start just after Back. Screens without a Back
 * button (the dashboard) start at the top.
 */
function firstScreenControl(): HTMLElement | undefined {
  const list = candidates();
  const back = list.findIndex(el => el.getAttribute('aria-label') === SCREEN_BACK_LABEL);
  if (back < 0) {
    return list[0];
  }
  // Never land on something that changes the room: the press that opened the
  // screen can repeat (a held OK), and on Climate the first control is the AC
  // power switch. Fall back to Back itself when every control is one (Climate).
  const safe = list
    .slice(back + 1)
    .find(el => !ROOM_CONTROL_LABEL.test(el.getAttribute('aria-label') ?? ''));
  return safe ?? list[back];
}

/**
 * Labels of controls that switch real room hardware (TvAcScreen, TvLightsScreen,
 * the dashboard's scene/curtain cards). Labels, because these are the only
 * stable handle the DOM gives us; keep in sync if those labels change.
 */
const ROOM_CONTROL_LABEL =
  /^turn |, currently (on|off)$|^(cooler|warmer|slower|faster)$|^fan (level|speed)|mode$|^toggle |curtain/i;

/**
 * Put the highlight somewhere sensible when a new screen appears.
 *
 * Without this the first arrow press after navigating lands on whatever
 * `candidates()` happens to return first, so the guest presses a direction and
 * the highlight appears somewhere unrelated. Seeding on arrival means there is
 * always a visible starting point:
 *  - going back: the element the guest left from, once it is visible again;
 *  - going forward: the new screen's first control (`firstScreenControl`).
 *
 * Only seeds when nothing useful is focused: if the previous screen's element
 * was removed, `document.activeElement` falls back to <body>; if that screen
 * stayed mounted underneath, the tile that opened this one keeps focus but is
 * no longer `isVisible`. An element that survived the transition (a modal's
 * button) is left alone.
 */
/** Frames to wait, going back, for the screen underneath to finish uncovering. */
const RETURN_WAIT_FRAMES = 20;

/** A back-restore is waiting for its element to be uncovered. */
let restoring = false;

function seedFocus(back: boolean, attempt = 0): void {
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && isVisible(active)) {
    restoring = false;
    return;
  }
  // Back: return to the newest remembered element once it is on screen again —
  // the screen underneath can still be finishing its transition (aria-hidden
  // lifts a few frames after the pop). `restoring` keeps a follow-up state
  // event (e.g. AppNavigator's forgetTab reset) from stealing the highlight.
  if (back || restoring) {
    restoring = true;
    while (returnTo.length) {
      const el = returnTo[returnTo.length - 1];
      if (!el || !el.isConnected) {
        returnTo.pop();
        continue;
      }
      if (isVisible(el)) {
        returnTo.pop();
        restoring = false;
        el.focus();
        return;
      }
      if (attempt < RETURN_WAIT_FRAMES) {
        requestAnimationFrame(() => seedFocus(true, attempt + 1));
        return;
      }
      break;
    }
    restoring = false;
    firstScreenControl()?.focus();
    return;
  }
  // Forward: start on the new screen's first control. (The element that opened
  // it was already remembered by the state listener — see `lastActivated`.)
  firstScreenControl()?.focus();
}

/**
 * The control the guest last pressed — OK on the remote or a Magic Remote
 * click. Read when a forward navigation lands: THAT is the tile Back should
 * return to. Not `document.activeElement` at seeding time, because several
 * screens take focus for themselves before `seedFocus` gets to run.
 */
let lastActivated: HTMLElement | null = null;

type NavState = {
  type?: string;
  index?: number;
  history?: unknown[];
  routes?: {state?: NavState}[];
};

/**
 * How deep the guest is: tab history length plus each focused stack's index.
 * It grows on every forward move (push, or jump to another tab) and shrinks on
 * every Back, which is how `seedFocus` tells the two apart — the DOM cannot,
 * because a popped screen can linger for a few frames.
 *
 * A stack's ROOT counts 0, not 1: the Reception tab has no stack at all, so
 * counting roots made the dashboard (history 1 + root 1) and the chat
 * (history 2 + nothing) look equally deep, and Help Desk read as no move.
 */
function navDepth(): number {
  let depth = 0;
  let state = navigationRef.getRootState() as NavState | undefined;
  while (state) {
    depth += state.type === 'tab' ? (state.history?.length ?? 1) : (state.index ?? 0);
    state = state.routes?.[state.index ?? 0]?.state;
  }
  return depth;
}

let lastDepth = 0;

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
    const depth = navDepth();
    const back = depth < lastDepth;
    if (depth > lastDepth && lastActivated?.isConnected) {
      returnTo.push(lastActivated);
      if (returnTo.length > RETURN_DEPTH) {
        returnTo.shift();
      }
    }
    lastActivated = null;
    lastDepth = depth;
    requestAnimationFrame(() => requestAnimationFrame(() => seedFocus(back)));
  });

  // Magic Remote pointer: a click is the same "this opened the next screen".
  document.addEventListener(
    'click',
    event => {
      const target = event.target instanceof Element ? event.target : null;
      lastActivated = target?.closest<HTMLElement>(FOCUSABLE_SELECTOR) ?? null;
    },
    true,
  );

  // Magic Remote pointer: the control under the cursor takes focus, so it shows
  // the same ring the D-pad gives (LG self-check "Mouse Over/Focus") and the
  // arrow keys carry on from where the pointer left off. Text fields are left
  // alone — focusing one opens the webOS on-screen keyboard.
  document.addEventListener('mouseover', event => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest<HTMLElement>(FOCUSABLE_SELECTOR);
    if (
      !control ||
      control === document.activeElement ||
      control.matches('input, textarea, select') ||
      !isVisible(control)
    ) {
      return;
    }
    control.focus({preventScroll: true});
  });

  document.addEventListener(
    'keydown',
    event => {
      if (event.keyCode === KEY_OK) {
        lastActivated = document.activeElement as HTMLElement | null;
      }
      if (event.keyCode === KEY_BACK_WEBOS || event.keyCode === KEY_BACK_TIZEN) {
        // Priority 1: close the top-most open modal (dialog / payment sheet).
        // Priority 2: pop the navigator (React Navigation is not wired to
        // browser history — history.back() would exit the app from anywhere).
        // At the root with nothing open:
        //  - webOS: platformBack(). appinfo sets disableBackHistoryAPI, so the
        //    system does nothing on its own — LG requires the entry screen to
        //    show the exit popup (webOS 6+) or open Home (5.0), and
        //    platformBack() is what triggers that platform behaviour.
        //  - Tizen: swallow it. In a hotel the app IS the TV's home screen, so
        //    Back at the root must not leave it.
        event.preventDefault();
        if (!closeTopModal() && !goBackIfPossible() && !IS_TIZEN) {
          platformBack();
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

      // Nothing focused yet (fresh screen), or focus was left on a screen that is
      // now covered — seed focus at the screen's first control.
      if (!active || active === document.body || !isVisible(active)) {
        firstScreenControl()?.focus();
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

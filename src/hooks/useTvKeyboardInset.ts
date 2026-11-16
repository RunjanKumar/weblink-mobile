/**
 * How much of the screen the TV's on-screen keyboard covers, in px. 0 while it
 * is closed.
 *
 * Only the Android TV wrapper reports it, to the web build — see
 * `useTvKeyboardInset.web.ts` (keep the two in sync). A native app is resized
 * for the keyboard by the OS, so here it is always 0.
 */
export function useTvKeyboardInset(): number {
  return 0;
}

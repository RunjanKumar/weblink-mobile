import {useEffect, useState} from 'react';

/**
 * How much of the screen the TV's on-screen keyboard covers, in the px styles
 * use (under the ten-foot `zoom` in web/index.html). 0 while it is closed.
 *
 * Mirrors `useTvKeyboardInset.ts` — keep the two in sync.
 *
 * The Android TV wrapper's window is fullscreen, and Android never resizes a
 * fullscreen window for the keyboard: it covers the bottom of the page. The
 * wrapper (MainActivity.reportKeyboard) measures the covered share of the
 * screen and reports it as `window.__nexgenKeyboard` with a `nexgen:keyboard`
 * event. webOS and Tizen never send it, so there this stays 0.
 */
export function useTvKeyboardInset(): number {
  const [inset, setInset] = useState(readInset);

  useEffect(() => {
    const onChange = () => setInset(readInset());
    window.addEventListener('nexgen:keyboard', onChange);
    return () => window.removeEventListener('nexgen:keyboard', onChange);
  }, []);

  return inset;
}

function readInset(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const share = (window as {__nexgenKeyboard?: number}).__nexgenKeyboard ?? 0;
  if (!share) {
    return 0;
  }
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  return (share * window.innerHeight) / zoom;
}

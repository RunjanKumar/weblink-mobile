import {useEffect, useState} from 'react';

/**
 * False while the app is not on screen.
 *
 * Mirrors `useAppVisible.ts` exactly — keep the two in sync.
 *
 * webOS fires `visibilitychange` when the guest switches TV input or opens
 * another app, and the web app keeps running the whole time. Without this, a
 * looping animation carries on repainting for as long as the television is
 * powered on, which on a set that is never switched off is days.
 */
export function useAppVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    onChange();
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

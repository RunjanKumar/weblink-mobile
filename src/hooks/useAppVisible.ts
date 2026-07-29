import {useEffect, useState} from 'react';
import {AppState} from 'react-native';

/**
 * False while the app is not in the foreground.
 *
 * Exists so perpetual work — looping animations, pollers — can stop when nobody
 * is looking. That matters most on a hotel TV, which is powered on for days and
 * gets switched to another input rather than closed.
 *
 * Web/webOS has its own implementation in `useAppVisible.web.ts` — keep the two
 * in sync.
 */
export function useAppVisible(): boolean {
  const [visible, setVisible] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setVisible(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return visible;
}

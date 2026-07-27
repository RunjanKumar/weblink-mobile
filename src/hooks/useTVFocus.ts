import {useCallback, useState} from 'react';
import type {
  NativeSyntheticEvent,
  TargetedEvent,
} from 'react-native';

type FocusHandler = (e: NativeSyntheticEvent<TargetedEvent>) => void;

export interface TVFocusState {
  focused: boolean;
  onFocus: FocusHandler;
  onBlur: FocusHandler;
}

/**
 * Tracks focus state for a focusable element and forwards optional external
 * handlers. On Android TV, `onFocus`/`onBlur` fire as the D-pad moves the
 * highlight; components use `focused` to render a visible focus ring.
 */
export function useTVFocus(external?: {
  onFocus?: FocusHandler | null;
  onBlur?: FocusHandler | null;
}): TVFocusState {
  const [focused, setFocused] = useState(false);

  const onFocus = useCallback<FocusHandler>(
    e => {
      setFocused(true);
      external?.onFocus?.(e);
    },
    [external],
  );

  const onBlur = useCallback<FocusHandler>(
    e => {
      setFocused(false);
      external?.onBlur?.(e);
    },
    [external],
  );

  return {focused, onFocus, onBlur};
}

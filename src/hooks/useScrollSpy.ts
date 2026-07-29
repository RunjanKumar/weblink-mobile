import {useCallback, useRef, useState} from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

/** Height of the sticky category-tab bar (reference STICKY_OFFSET). */
export const STICKY_OFFSET = 72;
const ACTIVATION_SLACK = 20;
const PROGRAMMATIC_LOCK_MS = 900;

/**
 * Category scroll-spy — the RN port of the reference mechanism
 * (`foodListViewModel.js`): the active section is the LAST one whose top has
 * passed `STICKY_OFFSET + 20`, tab taps scroll to `sectionY − STICKY_OFFSET`,
 * and a 900 ms lockout stops the spy from fighting the programmatic scroll
 * (released early when the momentum ends).
 *
 * Sections must be DIRECT children of the ScrollView content so their
 * `onLayout` y-offsets are in content coordinates.
 */
export function useScrollSpy(sectionCount: number) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetsRef = useRef<Record<number, number>>({});
  const lockUntilRef = useRef(0);
  const programmaticRef = useRef(false);
  const lastReportedRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  /** Attach as `onLayout` of section `index` (re-fires on any reflow). */
  const registerSection = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      offsetsRef.current[index] = event.nativeEvent.layout.y;
    },
    [],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Date.now() < lockUntilRef.current) {
        return;
      }
      const y = event.nativeEvent.contentOffset.y;
      let active = 0;
      for (let i = 0; i < sectionCount; i++) {
        const sectionY = offsetsRef.current[i];
        if (sectionY != null && sectionY - STICKY_OFFSET <= y + ACTIVATION_SLACK) {
          active = i;
        }
      }
      if (active !== lastReportedRef.current) {
        lastReportedRef.current = active;
        setActiveIndex(active);
      }
    },
    [sectionCount],
  );

  const scrollToSection = useCallback((index: number) => {
    const sectionY = offsetsRef.current[index];
    if (sectionY == null) {
      return;
    }
    lockUntilRef.current = Date.now() + PROGRAMMATIC_LOCK_MS;
    programmaticRef.current = true;
    lastReportedRef.current = index;
    setActiveIndex(index);
    scrollRef.current?.scrollTo({y: Math.max(0, sectionY - STICKY_OFFSET), animated: true});
  }, []);

  /**
   * Release the lockout when OUR animated scroll settles. A user fling ending
   * must not release it early (that would flicker the active tab mid-animation).
   */
  const onMomentumScrollEnd = useCallback(() => {
    if (programmaticRef.current) {
      programmaticRef.current = false;
      lockUntilRef.current = 0;
    }
  }, []);

  return {scrollRef, activeIndex, registerSection, onScroll, scrollToSection, onMomentumScrollEnd};
}

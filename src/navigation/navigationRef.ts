import {CommonActions, createNavigationContainerRef} from '@react-navigation/native';

/**
 * Container ref for navigating from outside React.
 *
 * Needed by the webOS Back button: the remote delivers a raw keydown, and the
 * handler that receives it lives outside the component tree, so it has no
 * `navigation` prop to call. Harmless on native — nothing there uses it yet.
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Pop one screen. Returns false when there is nothing to pop, which the caller
 * uses to let the platform close the app instead of swallowing the press.
 *
 * Tab fallback: the TV hides the bottom bar entirely, so a guest sitting at
 * another tab's ROOT (Food menu, Facilities…) has no visible way home — and
 * without this, Back there would exit the app. When nothing can pop but the
 * active tab is not Home, Back returns to the Home tab instead. Only the webOS
 * remote handler calls this, so phone behaviour is untouched.
 */
export function goBackIfPossible(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
    return true;
  }

  // Walk nested navigator state looking for a tab navigator off Home.
  type NavState = {
    type?: string;
    index?: number;
    routes?: {name: string; state?: NavState}[];
  };
  let state: NavState | undefined = navigationRef.getRootState();
  while (state) {
    if (state.type === 'tab') {
      const current = state.routes?.[state.index ?? 0];
      if (current && current.name !== 'Home') {
        navigationRef.dispatch(CommonActions.navigate({name: 'Home'}));
        return true;
      }
      return false;
    }
    state = state.routes?.[state.index ?? 0]?.state;
  }
  return false;
}

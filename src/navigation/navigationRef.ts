import {createNavigationContainerRef} from '@react-navigation/native';

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
 */
export function goBackIfPossible(): boolean {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
    return true;
  }
  return false;
}

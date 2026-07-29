/**
 * Registry of currently-open modal layers (dialogs, bottom sheets).
 *
 * Two consumers:
 *  - the webOS Back key (461): must close the TOP modal instead of popping the
 *    navigation stack underneath it;
 *  - the webOS spatial-nav walker: while a modal is open, D-pad focus must be
 *    restricted to that modal's subtree (RNW's Modal only brackets Tab focus,
 *    not our synthetic arrow moves).
 *
 * Platform-neutral module (no DOM APIs) so native code can share it.
 */
interface ModalEntry {
  /** DOM id of the modal's content root (web); used to scope spatial nav. */
  rootId?: string;
  close: () => void;
}

const stack: ModalEntry[] = [];

/** Register an open modal. Returns its unregister function. */
export function registerModal(entry: ModalEntry): () => void {
  stack.push(entry);
  return () => {
    const index = stack.indexOf(entry);
    if (index >= 0) {
      stack.splice(index, 1);
    }
  };
}

/** Close the top-most modal. Returns false when none is open. */
export function closeTopModal(): boolean {
  const top = stack[stack.length - 1];
  if (!top) {
    return false;
  }
  top.close();
  return true;
}

/** Content-root DOM id of the top-most open modal (web focus scoping). */
export function topModalRootId(): string | undefined {
  return stack[stack.length - 1]?.rootId;
}

/**
 * Module-level toast emitter — mirrors the reference web app's sonner usage
 * (`toast.success/error/info(msg)`) so viewmodels can fire toasts without React
 * context plumbing. `<ToastHost/>` (mounted once in App.tsx) subscribes and
 * renders the stack.
 *
 * This replaces `Alert.alert` for transient feedback: RNW's Alert is an empty
 * stub, so on the TV those alerts silently did nothing.
 */
export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

export interface ToastOptions {
  duration?: number;
}

type Listener = (toast: ToastItem) => void;

const DEFAULT_DURATION = 3500;

let nextId = 1;
const listeners = new Set<Listener>();

function emit(kind: ToastKind, message: string, options?: ToastOptions): void {
  const item: ToastItem = {
    id: nextId++,
    kind,
    message,
    duration: options?.duration ?? DEFAULT_DURATION,
  };
  listeners.forEach(listener => listener(item));
}

export const toast = {
  success: (message: string, options?: ToastOptions) => emit('success', message, options),
  error: (message: string, options?: ToastOptions) => emit('error', message, options),
  info: (message: string, options?: ToastOptions) => emit('info', message, options),
};

/** ToastHost subscribes here. Returns an unsubscribe function. */
export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

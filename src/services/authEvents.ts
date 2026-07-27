/**
 * Lightweight event bus that decouples the transport layer (axios interceptor)
 * from React state. When the API returns 401, the interceptor emits here and the
 * AuthProvider (subscribed) performs the sign-out + navigation reset. This avoids
 * importing navigation/state into the api layer.
 */
type Listener = () => void;

const unauthorizedListeners = new Set<Listener>();

export const authEvents = {
  onUnauthorized(listener: Listener): () => void {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  },
  emitUnauthorized(): void {
    unauthorizedListeners.forEach(listener => listener());
  },
};

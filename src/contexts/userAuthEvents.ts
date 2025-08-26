// Simple event bus for user auth related global events
// Allows decoupled modules (like API services) to notify the auth context

export type UnauthorizedHandler = () => void;

const EVENT_UNAUTHORIZED = 'unauthorized';

class UserAuthEventBus extends EventTarget {
  emitUnauthorized() {
    this.dispatchEvent(new Event(EVENT_UNAUTHORIZED));
  }

  onUnauthorized(handler: UnauthorizedHandler) {
    const listener = () => handler();
    this.addEventListener(EVENT_UNAUTHORIZED, listener);
    return () => this.removeEventListener(EVENT_UNAUTHORIZED, listener);
  }
}

export const userAuthEvents = new UserAuthEventBus();

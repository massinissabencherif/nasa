import { useEffect, useRef } from 'react';
import { API_BASE } from './api';

export type LiveEvent = { type: string; [key: string]: unknown };
type Listener = (event: LiveEvent) => void;

// One EventSource for the whole app, shared by every screen. EventSource
// reconnects on its own when the server comes back.
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function ensureSource() {
  if (source) return;
  source = new EventSource(`${API_BASE}/api/events`);
  source.onmessage = (e) => {
    let event: LiveEvent;
    try {
      event = JSON.parse(e.data);
    } catch {
      return;
    }
    listeners.forEach((listener) => listener(event));
  };
}

/** Subscribe to live server events (scan progress, check-ins, alerts, context changes…). */
export function useSSE(onEvent: Listener) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    ensureSource();
    const listener: Listener = (event) => handler.current(event);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

/** Re-run `refresh` whenever one of the given event types arrives. */
export function useRefreshOn(types: string[], refresh: () => void) {
  useSSE((event) => {
    if (types.includes(event.type)) refresh();
  });
}

import { useEffect, useRef } from 'react';
import { API_BASE } from './api';

export function useSSE(onEvent: (event: Record<string, unknown>) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/api/events`);
    source.onmessage = (e) => {
      try {
        handler.current(JSON.parse(e.data));
      } catch {
        // heartbeat / non-JSON comment line, ignore
      }
    };
    return () => source.close();
  }, []);
}

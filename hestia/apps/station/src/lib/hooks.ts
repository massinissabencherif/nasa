import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CrewMember, CrewStatus, MissionContext, PantryState, Thresholds } from '@hestia/api-client';
import { api } from './api';
import { useRefreshOn } from './useSSE';

export function useConnection(): boolean | null {
  // null = first check still pending, so the UI does not flash "offline" at startup
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .health()
        .then(() => !cancelled && setConnected(true))
        .catch(() => !cancelled && setConnected(false));
    };
    check();
    const id = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return connected;
}

export type Station = {
  connected: boolean | null;
  context: MissionContext | null;
  refreshContext: () => void;
};

export const StationContext = createContext<Station>({
  connected: null,
  context: null,
  refreshContext: () => {},
});

export function useStation(): Station {
  return useContext(StationContext);
}

/** Owns the app-wide state: server reachability and the active mission context. */
export function useStationState(): Station {
  const connected = useConnection();
  const [context, setContext] = useState<MissionContext | null>(null);
  const refreshContext = useCallback(() => {
    api.getContext().then(setContext).catch(() => {});
  }, []);
  useEffect(() => {
    if (connected) refreshContext();
  }, [connected, refreshContext]);
  useRefreshOn(['context_changed', 'reset'], refreshContext);
  return { connected, context, refreshContext };
}

export function useCrew(): CrewMember[] {
  const { connected } = useStation();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const refresh = useCallback(() => {
    api.listCrew().then(setCrew).catch(() => {});
  }, []);
  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);
  useRefreshOn(['reset'], refresh);
  return crew;
}

export function useCrewStatuses(crew: CrewMember[]): Record<number, CrewStatus> {
  const [statuses, setStatuses] = useState<Record<number, CrewStatus>>({});
  const refresh = useCallback(() => {
    if (crew.length === 0) return;
    Promise.all(crew.map((c) => api.getCrewStatus(c.id).then((s) => [c.id, s] as const)))
      .then((pairs) => setStatuses(Object.fromEntries(pairs)))
      .catch(() => {});
  }, [crew]);
  useEffect(refresh, [refresh]);
  useRefreshOn(['checkin', 'alert_created', 'reset', 'context_changed'], refresh);
  return statuses;
}

export function useThresholds(): Thresholds | null {
  const { connected } = useStation();
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  useEffect(() => {
    if (connected) api.getThresholds().then(setThresholds).catch(() => {});
  }, [connected]);
  return thresholds;
}

export function usePantry() {
  const { connected } = useStation();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const refresh = useCallback(() => {
    api.getPantry().then(setPantry).catch(() => {});
  }, []);
  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);
  return { pantry, refresh };
}

export function formatDelay(seconds: number): string {
  if (seconds < 1) return 'near-instant';
  if (seconds < 60) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}

import { useCallback, useEffect, useState } from 'react';
import type { CrewMember, CrewStatus, MissionContext, PantryState } from '@hestia/api-client';
import { api } from './api';

export function useConnection(): boolean {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .health()
        .then(() => !cancelled && setConnected(true))
        .catch(() => !cancelled && setConnected(false));
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return connected;
}

export function useMissionContext(): MissionContext | null {
  const [context, setContext] = useState<MissionContext | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .getContext()
      .then((c) => !cancelled && setContext(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return context;
}

export function useCrew(): CrewMember[] {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  useEffect(() => {
    api.listCrew().then(setCrew).catch(() => {});
  }, []);
  return crew;
}

export function useCrewStatuses(crew: CrewMember[]): Record<number, CrewStatus> {
  const [statuses, setStatuses] = useState<Record<number, CrewStatus>>({});
  useEffect(() => {
    if (crew.length === 0) return;
    let cancelled = false;
    Promise.all(crew.map((c) => api.getCrewStatus(c.id).then((s) => [c.id, s] as const))).then(
      (pairs) => {
        if (cancelled) return;
        setStatuses(Object.fromEntries(pairs));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [crew]);
  return statuses;
}

export function usePantry() {
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const refresh = useCallback(() => {
    api.getPantry().then(setPantry).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { pantry, refresh };
}

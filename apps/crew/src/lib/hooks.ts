import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CrewMember, CrewStatus, Measurement, MealProposal } from '@hestia/api-client';
import { useApi } from './ApiProvider';
import { getSelectedCrewId, subscribeSelectedCrewId } from './profile';

export function useSelectedCrewId(): number | null {
  return useSyncExternalStore(subscribeSelectedCrewId, getSelectedCrewId, getSelectedCrewId);
}

export function useConnection(): boolean {
  const api = useApi();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = () => api.health().then(() => !cancelled && setConnected(true)).catch(() => !cancelled && setConnected(false));
    check();
    const id = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [api]);
  return connected;
}

export function useCrewList(): CrewMember[] {
  const api = useApi();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  useEffect(() => {
    api.listCrew().then(setCrew).catch(() => {});
  }, [api]);
  return crew;
}

export function useCrewMember(id: number | null): CrewMember | null {
  const crew = useCrewList();
  if (id == null) return null;
  return crew.find((c) => c.id === id) ?? null;
}

export function useCrewStatus(id: number | null): CrewStatus | null {
  const api = useApi();
  const [status, setStatus] = useState<CrewStatus | null>(null);
  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    api.getCrewStatus(id).then((s) => !cancelled && setStatus(s)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, id]);
  return status;
}

export function useMeasurements(id: number | null, type: string, days = 30): Measurement[] {
  const api = useApi();
  const [data, setData] = useState<Measurement[]>([]);
  useEffect(() => {
    if (id == null) return;
    api.getMeasurements(id, { type, days }).then(setData).catch(() => {});
  }, [api, id, type, days]);
  return data;
}

export function useMealProposal(id: number | null) {
  const api = useApi();
  const [proposal, setProposal] = useState<MealProposal | null>(null);
  const refresh = () => {
    if (id == null) return;
    api.getMealProposal(id).then(setProposal).catch(() => {});
  };
  useEffect(refresh, [api, id]);
  return { proposal, refresh };
}

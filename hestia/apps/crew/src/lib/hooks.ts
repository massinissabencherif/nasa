import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type {
  Alert,
  CrewMember,
  CrewStatus,
  GamificationReport,
  LatestMeasurements,
  Measurement,
  MealProposal,
  MissionContext,
  Reminder,
  Thresholds,
} from '@hestia/api-client';
import { useApi } from './ApiProvider';
import { getSelectedCrewId, subscribeSelectedCrewId } from './profile';

// The crew app polls instead of holding an SSE stream: polling survives a phone
// going to sleep, a flaky hotspot and WebView quirks, and 5 s is live enough here.
const POLL_MS = 5000;

export function useSelectedCrewId(): number | null {
  return useSyncExternalStore(subscribeSelectedCrewId, getSelectedCrewId, getSelectedCrewId);
}

/** Fetch now, then again every POLL_MS; `refresh` forces an immediate refetch. */
function usePolled<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[],
): { data: T | null; error: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher ?? (() => Promise.resolve(null as T)), deps);
  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    let sequence = 0;
    const load = async () => {
      const request = ++sequence;
      try {
        const value = await run();
        if (!cancelled && request === sequence) {
          setData(value);
          setError(false);
        }
      } catch {
        if (!cancelled && request === sequence) setError(true);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, refresh };
}

export function useConnection(): boolean | null {
  const api = useApi();
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    setConnected(null);
    const check = () =>
      api
        .health()
        .then(() => !cancelled && setConnected(true))
        .catch(() => !cancelled && setConnected(false));
    check();
    const id = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [api]);
  return connected;
}

export function useCrewList(): CrewMember[] {
  return useCrewListState().data ?? [];
}

export function useCrewListState() {
  const api = useApi();
  return usePolled(() => api.listCrew(), [api]);
}

export function useCrewMember(id: number | null): CrewMember | null {
  const crew = useCrewList();
  if (id == null) return null;
  return crew.find((c) => c.id === id) ?? null;
}

export function useCrewStatus(id: number | null): CrewStatus | null {
  return useCrewStatusState(id).data;
}

export function useCrewStatusState(id: number | null) {
  const api = useApi();
  return usePolled(id == null ? null : () => api.getCrewStatus(id), [api, id]);
}

export function useMissionContext(): MissionContext | null {
  const api = useApi();
  return usePolled(() => api.getContext(), [api]).data;
}

/** Keep the response tied to its query so a previous value never gets a new unit. */
export function useMeasurementState(id: number | null, type: string, days = 30) {
  const api = useApi();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    api: typeof api;
    id: number;
    type: string;
    days: number;
    revision: number;
    data: Measurement[] | null;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    const query = { api, id, type, days, revision };
    api
      .getMeasurements(id, { type, days })
      .then((data) => {
        if (!cancelled) setResult({ ...query, data, error: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ ...query, data: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [api, id, type, days, revision]);
  const current =
    result?.api === api &&
    result.id === id &&
    result.type === type &&
    result.days === days &&
    result.revision === revision
      ? result
      : null;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { data: current?.data ?? null, error: current?.error ?? false, refresh };
}

export function useLatestMeasurements(id: number | null): LatestMeasurements | null {
  const api = useApi();
  const [latest, setLatest] = useState<LatestMeasurements | null>(null);
  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    api
      .getLatestMeasurements(id)
      .then((l) => !cancelled && setLatest(l))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, id]);
  return latest;
}

export function useThresholds(): Thresholds | null {
  const api = useApi();
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  useEffect(() => {
    api
      .getThresholds()
      .then(setThresholds)
      .catch(() => {});
  }, [api]);
  return thresholds;
}

export function useMyAlerts(id: number | null) {
  const api = useApi();
  const { data, refresh } = usePolled(
    id == null
      ? null
      : () => api.getAlerts().then((all) => all.filter((a: Alert) => a.crew_member_id === id && !a.resolved)),
    [api, id],
  );
  return { alerts: data ?? [], refresh };
}

export function useGamification(id: number | null): GamificationReport | null {
  const api = useApi();
  return usePolled(id == null ? null : () => api.getGamification(id), [api, id]).data;
}

export function useReminders(id: number | null): Reminder[] {
  const api = useApi();
  return usePolled(id == null ? null : () => api.getReminders(id), [api, id]).data ?? [];
}

export function useMealProposal(id: number | null) {
  const api = useApi();
  const { data, error, refresh } = usePolled<MealProposal>(
    id == null ? null : () => api.getMealProposal(id),
    [api, id],
  );
  return { proposal: data, error, refresh };
}

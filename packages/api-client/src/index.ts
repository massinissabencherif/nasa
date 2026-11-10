export type HealthResponse = { status: string; service: string };

export type MissionContext = {
  id: number;
  type: string;
  label: string;
  delay_s: number;
  radiation_msv_day: number;
  resupply_days: number | null;
  active: boolean;
};

export type CrewMember = {
  id: number;
  name: string;
  sex: 'M' | 'F';
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_factor: number;
  avatar: string;
};

export type Level = 'green' | 'orange' | 'red';

export type ZoneStatus = {
  level: Level;
  indicators: Record<string, Level | null>;
  hazard: string;
};

export type CrewStatus = Record<string, ZoneStatus>;

export type Measurement = {
  id: number;
  ts: string;
  crew_member_id: number;
  type: string;
  value: number;
  unit: string;
  source: 'manual' | 'camera' | 'simulated';
  note: string | null;
};

export type PantrySlot = {
  slot: string;
  item: string | null;
  food_item_id: number | null;
  capacity: number;
  count: number | null;
  confidence: number | null;
  source: string | null;
  needs_confirmation: boolean;
};

export type PantryState = {
  snapshot_ts: string | null;
  slots: PantrySlot[];
  autonomy_days: number;
  daily_need_kcal: number;
  stock_kcal: number;
  expiry_warning: boolean;
  assumption: string;
};

export type ScanSlotResult = { slot: string; count: number; confidence: number; needs_confirmation: boolean };

export type ScanResponse = {
  snapshot_ts: string;
  strategy: string;
  elapsed_s: number;
  slots: ScanSlotResult[];
};

export type ConsumptionEvent = {
  id: number;
  ts: string;
  food_item_id: number;
  qty: number;
  crew_member_id: number | null;
};

export type RationPlan = {
  target_days: number;
  ration_pct: number;
  below_safety_floor: boolean;
  daily_kcal_per_crew: Record<string, number>;
  projected_weight_change_kg_per_crew: Record<string, number>;
  assumptions: string[];
};

export type Alert = {
  id: number;
  ts: string;
  crew_member_id: number;
  level: Level;
  indicator: string;
  message: string;
  sent_to_earth: boolean;
  acked: boolean;
};

export type EarthMessage = {
  id: number;
  created_ts: string;
  deliver_ts: string;
  payload: string;
  status: string;
  alert_id: number | null;
};

export type ShelfSlot = {
  id: number;
  label: string;
  food_item_id: number | null;
  capacity: number;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createApiClient(baseUrl: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let detail = body;
      try {
        detail = JSON.parse(body).detail ?? body;
      } catch {
        // not JSON, use raw text
      }
      throw new ApiError(res.status, detail || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    baseUrl,
    health: () => request<HealthResponse>('/health'),

    getContext: () => request<MissionContext>('/api/context'),
    setContext: (type: string) =>
      request<MissionContext>('/api/context', { method: 'PUT', body: JSON.stringify({ type }) }),

    listCrew: () => request<CrewMember[]>('/api/crew'),
    getCrewStatus: (id: number) => request<CrewStatus>(`/api/crew/${id}/status`),
    getMeasurements: (id: number, opts?: { type?: string; days?: number }) => {
      const params = new URLSearchParams();
      if (opts?.type) params.set('type', opts.type);
      if (opts?.days) params.set('days', String(opts.days));
      const qs = params.toString();
      return request<Measurement[]>(`/api/crew/${id}/measurements${qs ? `?${qs}` : ''}`);
    },
    checkin: (id: number, body: Record<string, unknown>) =>
      request<Measurement[]>(`/api/crew/${id}/checkin`, { method: 'POST', body: JSON.stringify(body) }),

    getPantry: () => request<PantryState>('/api/pantry'),
    scanPantry: (opts?: { mode?: 'mock' | 'image' | 'camera'; image_path?: string; camera_index?: number }) => {
      const params = new URLSearchParams();
      params.set('mode', opts?.mode ?? 'mock');
      if (opts?.image_path) params.set('image_path', opts.image_path);
      if (opts?.camera_index !== undefined) params.set('camera_index', String(opts.camera_index));
      return request<ScanResponse>(`/api/pantry/scan?${params.toString()}`, { method: 'POST' });
    },
    confirmSlot: (slot: string, count: number) =>
      request(`/api/pantry/confirm`, { method: 'POST', body: JSON.stringify({ slot, count }) }),
    getGrid: () => request<ShelfSlot[]>('/api/pantry/grid'),
    updateGridSlot: (label: string, body: { capacity?: number; food_item_id?: number }) =>
      request<ShelfSlot>('/api/pantry/grid', { method: 'PUT', body: JSON.stringify({ label, ...body }) }),
    getGridBoxes: () => request<Record<string, [number, number, number, number]>>('/api/pantry/grid-boxes'),
    updateGridBox: (label: string, box: [number, number, number, number]) =>
      request('/api/pantry/grid-boxes', { method: 'PUT', body: JSON.stringify({ label, box }) }),
    snapshotImageUrl: () => `${baseUrl}/api/pantry/snapshot-image?t=${Date.now()}`,
    getConsumption: () => request<ConsumptionEvent[]>('/api/pantry/consumption'),
    getRations: (days: number) => request<RationPlan>(`/api/rations?days=${days}`),

    getAlerts: () => request<Alert[]>('/api/alerts'),
    ackAlert: (id: number) => request<Alert>(`/api/alerts/${id}/ack`, { method: 'POST' }),

    getEarthMessages: () => request<EarthMessage[]>('/api/earth/messages'),

    eventsUrl: () => `${baseUrl}/api/events`,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

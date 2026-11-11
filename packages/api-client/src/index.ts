export type HealthResponse = { status: string; service: string };

export type MissionContext = {
  id: number;
  type: string;
  label: string;
  delay_s: number;
  radiation_msv_day: number;
  resupply_days: number | null;
  next_resupply_in_days: number | null;
  active: boolean;
  time_scale: number;
  use_llm_advice: boolean;
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
  display: Record<string, string>;
  hazard: string;
};

export type CrewStatus = Record<string, ZoneStatus>;

export type LatestMeasurements = Record<string, { value: number; unit: string; ts: string }>;

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
  autonomy_days: number;
};

export type PantryState = {
  snapshot_ts: string | null;
  slots: PantrySlot[];
  autonomy_days: number;
  daily_need_kcal: number;
  stock_kcal: number;
  expiry_warning: boolean;
  min_expiry_days: number | null;
  units_per_lot: number;
  macro_autonomy_days: { protein: number; carbs: number; fat: number };
  pending_meals: number;
  assumption: string;
};

export type ScanSlotResult = { slot: string; count: number; confidence: number; needs_confirmation: boolean };

export type ScanResponse = {
  snapshot_ts: string;
  mode: string;
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
  food_name: string | null;
  crew_name: string | null;
};

export type RationCrewLine = {
  crew_member_id: number;
  name: string;
  need_kcal: number;
  ration_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  weight_change_kg: number;
};

export type RationPlan = {
  target_days: number;
  ration_pct: number;
  below_safety_floor: boolean;
  safety_floor_pct: number;
  per_crew: RationCrewLine[];
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
  resolved: boolean;
};

export type EarthMessage = {
  id: number;
  created_ts: string;
  deliver_ts: string;
  reply_ts: string;
  payload: string;
  reply_payload: string | null;
  status: 'queued' | 'delivered' | 'replied';
  alert_id: number | null;
};

export type ThresholdRule = { level: Level; when: Record<string, number> };
export type ThresholdConfig = {
  unit?: string;
  rules?: ThresholdRule[];
  default?: Level;
  [key: string]: unknown;
};
export type Thresholds = Record<string, ThresholdConfig>;

export type MealItem = {
  food_item_id: number;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  available_count: number;
};

export type MealProposal = {
  daily_need_kcal: number;
  kcal_eaten_today: number;
  kcal_remaining_today: number;
  nasa_reference_kcal: number;
  suggestion: { food_item_id: number; name: string; kcal: number }[];
  available: MealItem[];
};

export type ShelfSlot = {
  id: number;
  label: string;
  food_item_id: number | null;
  capacity: number;
};

export type CheckinAlert = {
  id: number;
  indicator: string;
  level: Level;
  message: string;
  sent_to_earth: boolean;
};

export type CheckinResult = { saved: number; alerts: CheckinAlert[]; status: CrewStatus };

export type Badge = { key: string; label: string; rule: string; earned: boolean };

export type GamificationReport = {
  streak: number;
  score: number;
  rank: number | null;
  crew_size: number;
  crew_score: number;
  meals_logged_today: number;
  badges: Badge[];
};

export type Reminder = { key: string; label: string; detail: string; done: boolean };

export type OllamaStatus = {
  running: boolean;
  model: string;
  installed: boolean;
  loaded: boolean;
  models_in_ram?: string[];
};

export type StationInfo = {
  lan_ip: string;
  port: number;
  api_url: string;
  crew_url: string;
  on_lan: boolean;
  ollama: OllamaStatus;
};

export type ForecastParams = {
  mission_days: number;
  ration_pct: number;
  exercise_h_per_day: number;
  resupply_delay_days: number;
  solar_storm: boolean;
  storm_dose_msv: number;
  storm_day: number;
};

export type ForecastPoint = {
  day: number;
  stock_days: number;
  weight_change_pct: number;
  bone_pct: number;
  radiation_msv: number;
};

export type ForecastSummary = {
  crew_need_kcal_day: number;
  autonomy_days_at_ration: number | null;
  resupply_day: number | null;
  stockout_day: number | null;
  days_without_food: number;
  required_ration_pct: number;
  required_ration_below_floor: boolean;
  ration_below_floor: boolean;
  safety_floor_pct: number;
  weight_change_pct_final: number;
  weight_per_crew: { crew_member_id: number; name: string; weight_kg: number; change_kg: number; change_pct: number }[];
  bone_pct_final: number;
  bone_loss_pct_per_month: number;
  radiation_msv_final: number;
  radiation_pct_of_limit: number;
  radiation_limit_msv: number;
  radiation_limit_day: number | null;
};

export type ForecastAssumption = { kind: 'method' | 'nasa' | 'assumption'; label: string; text: string };

export type ForecastResponse = {
  context: { type: string; label: string; radiation_msv_day: number; next_resupply_in_days: number | null };
  inputs: ForecastParams;
  series: ForecastPoint[];
  summary: ForecastSummary;
  assumptions: ForecastAssumption[];
};

export type ScanOptions = {
  mode?: 'mock' | 'image' | 'camera';
  image_path?: string;
  camera_index?: number;
  variant?: 'full' | 'after_removal';
  /** full = one call on the whole shelf (~20 s); row = three row crops (~50 s, more accurate) */
  strategy?: 'full' | 'row';
};

/** The server is unreachable (station off, wrong address, Wi-Fi down). */
export class NetworkError extends Error {}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createApiClient(baseUrl: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
        ...init,
      });
    } catch {
      throw new NetworkError(`Station unreachable at ${baseUrl}`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let detail = body;
      try {
        const parsed = JSON.parse(body).detail ?? body;
        // FastAPI validation errors come back as a list of {loc, msg}
        detail = Array.isArray(parsed)
          ? parsed.map((e) => `${(e.loc ?? []).slice(-1)[0]}: ${e.msg}`).join('; ')
          : String(parsed);
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
    setTimeScale: (timeScale: number) =>
      request<MissionContext>('/api/context', { method: 'PUT', body: JSON.stringify({ time_scale: timeScale }) }),
    setUseLlmAdvice: (useLlmAdvice: boolean) =>
      request<MissionContext>('/api/context', {
        method: 'PUT',
        body: JSON.stringify({ use_llm_advice: useLlmAdvice }),
      }),

    listCrew: () => request<CrewMember[]>('/api/crew'),
    getCrewStatus: (id: number) => request<CrewStatus>(`/api/crew/${id}/status`),
    getLatestMeasurements: (id: number) => request<LatestMeasurements>(`/api/crew/${id}/latest`),
    getMeasurements: (id: number, opts?: { type?: string; days?: number }) => {
      const params = new URLSearchParams();
      if (opts?.type) params.set('type', opts.type);
      if (opts?.days) params.set('days', String(opts.days));
      const qs = params.toString();
      return request<Measurement[]>(`/api/crew/${id}/measurements${qs ? `?${qs}` : ''}`);
    },
    checkin: (id: number, body: Record<string, unknown>) =>
      request<CheckinResult>(`/api/crew/${id}/checkin`, { method: 'POST', body: JSON.stringify(body) }),
    getGamification: (id: number) => request<GamificationReport>(`/api/crew/${id}/gamification`),
    getReminders: (id: number) => request<Reminder[]>(`/api/crew/${id}/reminders`),
    getMealProposal: (id: number) => request<MealProposal>(`/api/crew/${id}/meal`),
    eatMeal: (id: number, foodItemId: number, qty = 1) =>
      request(`/api/crew/${id}/meal`, {
        method: 'POST',
        body: JSON.stringify({ food_item_id: foodItemId, qty }),
      }),

    getPantry: () => request<PantryState>('/api/pantry'),
    scanPantry: (opts?: ScanOptions) => {
      const params = new URLSearchParams();
      params.set('mode', opts?.mode ?? 'mock');
      if (opts?.image_path) params.set('image_path', opts.image_path);
      if (opts?.variant) params.set('variant', opts.variant);
      if (opts?.strategy) params.set('strategy', opts.strategy);
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
    advanceEarthTime: (seconds: number) =>
      request<{ advanced_seconds: number }>(`/api/earth/advance?seconds=${seconds}`, { method: 'POST' }),

    forecast: (params: ForecastParams) =>
      request<ForecastResponse>('/api/forecast', { method: 'POST', body: JSON.stringify(params) }),

    getStationInfo: () => request<StationInfo>('/api/station/info'),
    crewQrUrl: () => `${baseUrl}/api/station/qr.svg`,

    runScenario: (name: string) =>
      request<{ status: string }>(`/api/demo/scenario/${name}`, { method: 'POST' }),

    getThresholds: () => request<Thresholds>('/api/thresholds'),

    eventsUrl: () => `${baseUrl}/api/events`,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

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

/** A vigilance level computed from a value. */
export type Level = 'green' | 'orange' | 'red';

/** What a zone can show: a level, or "unknown" when there is nothing recent to judge. */
export type ZoneLevel = Level | 'unknown';

export type ZoneStatus = {
  level: ZoneLevel;
  /** why the level is unknown: nothing ever recorded, or the newest reading is too old */
  reason: 'no_data' | 'stale' | null;
  /** the level of the last reading when it is stale */
  last_level: Level | null;
  /** ISO time of the newest reading behind this zone */
  last_ts: string | null;
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
  has_photo?: boolean;
  boxes?: ShelfBoxes;
  snapshot_ts: string | null;
  slots: PantrySlot[];
  autonomy_days: number;
  daily_need_kcal: number;
  stock_kcal: number;
  counted_package_kcal: number;
  default_units_per_lot: number;
  expiry_warning: boolean;
  min_expiry_days: number | null;
  units_per_lot: number;
  macro_autonomy_days: { protein: number; carbs: number; fat: number };
  pending_meals: number;
  assumption: string;
};

export type ScanSlotResult = { slot: string; count: number; confidence: number; needs_confirmation: boolean };

export type ScanResponse = {
  proposal_id?: string;
  boxes?: ShelfBoxes;
  warnings?: string[];
  snapshot_ts: string | null;
  mode: string;
  strategy?: string;
  elapsed_s?: number;
  autonomy_days?: number;
  slots?: ScanSlotResult[];
};

export type ShelfFrame = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  rows?: number;
  columns?: number;
};
export type ShelfBoxes = Record<string, [number, number, number, number]>;

export type ConsumptionEvent = {
  id: number;
  ts: string;
  food_item_id: number;
  qty: number;
  crew_member_id: number | null;
  food_name: string | null;
  crew_name: string | null;
  /** a meal is counted in portions; a scan in boxes, i.e. whole lots at the demo scale */
  unit: 'portion' | 'box';
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
  kind: 'report' | 'update';
  parent_id: number | null;
  crew_member_id: number | null;
  /** Latest values on board for the indicators Earth was sent. */
  onboard_now: OnboardReading[];
  /** Demo rules saying when the crew acts without waiting for the reply. */
  dont_wait: { rules: DontWaitRule[]; triggered: boolean } | null;
  plan: OnboardStep[];
};

export type OnboardReading = {
  indicator: string;
  sent_value: number | null;
  value: number | null;
  unit: string;
  level: Level | null;
  measured_ts: string | null;
  change: 'better' | 'worse' | 'same' | 'unknown';
};

export type DontWaitRule = {
  kind: 'critical' | 'second_person';
  indicator: string | null;
  text: string;
  triggered: boolean;
};

export type OnboardStep = { id: number; label: string; due_ts: string | null; done_ts: string | null };

export type EarthUpdatePreview = {
  summary: string;
  who: string;
  findings: { indicator: string; value: number | null; unit: string; previous: number | null; change: OnboardReading['change'] }[];
  actions_taken: string[];
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
  /** boxes seen on the shelf by the last scan */
  available_count: number;
  /** portions left in those boxes */
  available_portions: number;
};

export type MealProposal = {
  daily_need_kcal: number;
  kcal_eaten_today: number;
  kcal_remaining_today: number;
  suggestion: { food_item_id: number; name: string; kcal: number }[];
  available: MealItem[];
};

export type FoodItem = {
  id: number;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  units_per_lot: number;
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
  crew_url_secure: string | null;
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
  weight_per_crew: {
    crew_member_id: number;
    name: string;
    weight_kg: number;
    change_kg: number;
    change_pct: number;
  }[];
  bone_pct_final: number;
  bone_loss_pct_per_month: number;
  radiation_msv_final: number;
  radiation_pct_of_limit: number;
  radiation_limit_msv: number;
  radiation_limit_day: number | null;
};

export type ForecastAssumption = { kind: 'method' | 'nasa' | 'assumption'; label: string; text: string };

export type ForecastContext = {
  type: string;
  label: string;
  radiation_msv_day: number;
  next_resupply_in_days: number | null;
  crew_count: number;
  stock_kcal: number;
  current_dose_msv: number;
};

export type ForecastResponse = {
  context: ForecastContext;
  inputs: ForecastParams;
  series: ForecastPoint[];
  summary: ForecastSummary;
  assumptions: ForecastAssumption[];
};

/** A saved management-simulator run. The list omits context, series and assumptions. */
export type SimulationReportSummary = {
  id: number;
  created_ts: string;
  context_type: string;
  context_label: string;
  inputs: ForecastParams;
  summary: ForecastSummary;
};

export type SimulationReport = SimulationReportSummary & {
  context: ForecastContext;
  series: ForecastPoint[];
  assumptions: ForecastAssumption[];
};

export type VisionStrategy = 'full' | 'row' | 'cross';

export type ScanOptions = {
  mode?: 'mock' | 'image' | 'camera';
  image_path?: string;
  camera_index?: number;
  variant?: 'full' | 'after_removal';
  /** cross compares whole-shelf, row and configured stacked-item readings; it is slower, not guaranteed correct. */
  strategy?: VisionStrategy;
};

export type ReactionProtocol = {
  version: string;
  practice_trials: number;
  measured_trials: number;
  wait_min_ms: number;
  wait_max_ms: number;
  response_timeout_ms: number;
  feedback_ms: number;
  max_attempts: number;
  reference_sessions: number;
  note: string;
};

export type ReactionTrialInput = {
  trial_number: number;
  outcome: 'valid' | 'false_start' | 'no_response' | 'interrupted';
  reaction_ms?: number | null;
};

export type ReactionSessionInput = {
  id: string;
  protocol_version: string;
  device_id: string | null;
  started_at: string;
  ended_at: string;
  status: 'complete' | 'interrupted' | 'abandoned';
  source: 'manual' | 'simulated';
  practice_completed: number;
  trials: ReactionTrialInput[];
};

export type ReactionReference = {
  count: number;
  required: number;
  median_ms: number | null;
  difference_ms: number | null;
  difference_pct: number | null;
};

export type ReactionSessionSummary = Omit<ReactionSessionInput, 'trials'> & {
  crew_member_id: number;
  created_at: string;
  median_ms: number | null;
  valid_responses: number;
  false_starts: number;
  no_responses: number;
  reference: ReactionReference;
};

export type ReactionSessionDetail = ReactionSessionSummary & {
  trials: (ReactionTrialInput & { attempt: number })[];
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
      request<MissionContext>('/api/context', {
        method: 'PUT',
        body: JSON.stringify({ time_scale: timeScale }),
      }),
    setUseLlmAdvice: (useLlmAdvice: boolean) =>
      request<MissionContext>('/api/context', {
        method: 'PUT',
        body: JSON.stringify({ use_llm_advice: useLlmAdvice }),
      }),

    listCrew: () => request<CrewMember[]>('/api/crew'),
    getReactionProtocol: () =>
      request<ReactionProtocol>('/api/reaction/protocol', { signal: AbortSignal.timeout(5000) }),
    saveReactionSession: (crewId: number, body: ReactionSessionInput) =>
      request<ReactionSessionDetail>(`/api/crew/${crewId}/reaction-sessions`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      }),
    getReactionSessions: (
      crewId: number,
      opts?: { device_id?: string; protocol_version?: string; limit?: number; offset?: number },
    ) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(opts ?? {})) {
        if (value != null) params.set(key, String(value));
      }
      return request<ReactionSessionSummary[]>(`/api/crew/${crewId}/reaction-sessions?${params}`);
    },
    getReactionSession: (crewId: number, id: string) =>
      request<ReactionSessionDetail>(`/api/crew/${crewId}/reaction-sessions/${encodeURIComponent(id)}`),
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
      params.set('review', 'true');
      if (opts?.image_path) params.set('image_path', opts.image_path);
      if (opts?.variant) params.set('variant', opts.variant);
      if (opts?.strategy) params.set('strategy', opts.strategy);
      if (opts?.camera_index !== undefined) params.set('camera_index', String(opts.camera_index));
      return request<ScanResponse>(`/api/pantry/scan?${params.toString()}`, { method: 'POST' });
    },
    /** Upload a photo taken by any camera (phone, file). scan=false: reference image only. */
    uploadShelfPhoto: async (
      file: Blob,
      opts?: { scan?: boolean; strategy?: VisionStrategy; frame?: ShelfFrame },
    ): Promise<ScanResponse> => {
      const params = new URLSearchParams();
      params.set('scan', String(opts?.scan ?? true));
      if (opts?.strategy) params.set('strategy', opts.strategy);
      const form = new FormData();
      form.append('file', file, 'shelf.jpg');
      if (opts?.frame) form.append('frame', JSON.stringify(opts.frame));
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/api/pantry/photo?${params.toString()}`, { method: 'POST', body: form });
      } catch {
        throw new NetworkError(`Station unreachable at ${baseUrl}`);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, String(body.detail ?? res.statusText));
      }
      return res.json();
    },
    setGridFrame: (frame: { left: number; top: number; right: number; bottom: number }) =>
      request<Record<string, [number, number, number, number]>>('/api/pantry/grid-frame', {
        method: 'PUT',
        body: JSON.stringify(frame),
      }),
    confirmSlot: (slot: string, count: number) =>
      request(`/api/pantry/confirm`, { method: 'POST', body: JSON.stringify({ slot, count }) }),
    reviewImageUrl: (id: string) => `${baseUrl}/api/pantry/review/${encodeURIComponent(id)}/image`,
    emptyStock: () =>
      request('/api/pantry/empty', { method: 'POST', body: JSON.stringify({ confirmed: true }) }),
    saveScanReview: (id: string, counts: Record<string, number>, replaceStock = false) =>
      request(`/api/pantry/review/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ counts, replace_stock: replaceStock }),
      }),
    discardScanReview: (id: string) =>
      request(`/api/pantry/review/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getGrid: () => request<ShelfSlot[]>('/api/pantry/grid'),
    updateGridSlot: (label: string, body: { capacity?: number; food_item_id?: number }) =>
      request<ShelfSlot>('/api/pantry/grid', { method: 'PUT', body: JSON.stringify({ label, ...body }) }),
    setStockScale: (multiplier: number) =>
      request('/api/pantry/scale', { method: 'PUT', body: JSON.stringify({ multiplier }) }),
    updateFoodItem: (id: number, item: Pick<FoodItem, 'name' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>) =>
      request<FoodItem>(`/api/pantry/items/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    listFoodItems: () => request<FoodItem[]>('/api/pantry/items'),
    addFoodItem: (item: {
      name: string;
      kcal: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
    }) => request<FoodItem>('/api/pantry/items', { method: 'POST', body: JSON.stringify(item) }),
    getGridBoxes: () => request<Record<string, [number, number, number, number]>>('/api/pantry/grid-boxes'),
    updateGridBox: (label: string, box: [number, number, number, number]) =>
      request('/api/pantry/grid-boxes', { method: 'PUT', body: JSON.stringify({ label, box }) }),
    snapshotImageUrl: () => `${baseUrl}/api/pantry/snapshot-image?t=${Date.now()}`,
    getConsumption: () => request<ConsumptionEvent[]>('/api/pantry/consumption'),
    getRations: (days: number) => request<RationPlan>(`/api/rations?days=${days}`),

    getAlerts: () => request<Alert[]>('/api/alerts'),
    ackAlert: (id: number) => request<Alert>(`/api/alerts/${id}/ack`, { method: 'POST' }),

    getEarthMessages: () => request<EarthMessage[]>('/api/earth/messages'),
    tickOnboardStep: (stepId: number, done: boolean) =>
      request<OnboardStep>(`/api/earth/steps/${stepId}`, { method: 'POST', body: JSON.stringify({ done }) }),
    previewEarthUpdate: (messageId: number) => request<EarthUpdatePreview>(`/api/earth/messages/${messageId}/update`),
    sendEarthUpdate: (messageId: number) =>
      request<EarthMessage>(`/api/earth/messages/${messageId}/update`, { method: 'POST' }),
    advanceEarthTime: (seconds: number) =>
      request<{ advanced_seconds: number }>(`/api/earth/advance?seconds=${seconds}`, { method: 'POST' }),

    forecast: (params: ForecastParams) =>
      request<ForecastResponse>('/api/forecast', { method: 'POST', body: JSON.stringify(params) }),
    createSimulationReport: (params: ForecastParams) =>
      request<SimulationReport>('/api/forecast/reports', { method: 'POST', body: JSON.stringify(params) }),
    listSimulationReports: () => request<SimulationReportSummary[]>('/api/forecast/reports'),
    getSimulationReport: (id: number) => request<SimulationReport>(`/api/forecast/reports/${id}`),

    getStationInfo: () => request<StationInfo>('/api/station/info'),
    crewQrUrl: (secure = false) => `${baseUrl}/api/station/qr.svg?secure=${secure}`,

    runScenario: (name: string) =>
      request<{ status: string }>(`/api/demo/scenario/${name}`, { method: 'POST' }),

    getThresholds: () => request<Thresholds>('/api/thresholds'),

    eventsUrl: () => `${baseUrl}/api/events`,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

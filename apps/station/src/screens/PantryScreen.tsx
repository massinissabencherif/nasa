import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEvent, PantrySlot, RationPlan, ScanOptions } from '@hestia/api-client';
import { Button, IconCaution, IconCheck, IconScan, Panel, ReadoutNumber, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { usePantry, useStation } from '../lib/hooks';
import { useSSE } from '../lib/useSSE';

const ROWS = ['A', 'B', 'C'];
const COLS = ['1', '2', '3', '4'];

type ScanSource = { label: string; hint: string; options: ScanOptions; usesModel: boolean };

const SCAN_SOURCES: ScanSource[] = [
  { label: 'Live camera', hint: 'Webcam frame read by the local vision model.', options: { mode: 'camera' }, usesModel: true },
  {
    label: 'Test image: full shelf',
    hint: 'AI-generated test photo, read by the local vision model.',
    options: { mode: 'image', image_path: 'vision/fixtures/shelf_full.png' },
    usesModel: true,
  },
  {
    label: 'Test image: 3 boxes removed',
    hint: 'Same test photo with the A1 boxes removed, read by the local vision model.',
    options: { mode: 'image', image_path: 'vision/fixtures/shelf_after_removal.png' },
    usesModel: true,
  },
  { label: 'Replay: full shelf (no AI)', hint: 'Instant replay of known counts. Works without camera or Ollama.', options: { mode: 'mock', variant: 'full' }, usesModel: false },
  {
    label: 'Replay: 3 boxes removed (no AI)',
    hint: 'Instant replay of known counts. Works without camera or Ollama.',
    options: { mode: 'mock', variant: 'after_removal' },
    usesModel: false,
  },
];

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function slotColor(slot: PantrySlot | undefined): string {
  if (!slot || slot.count == null) return 'rgba(234,240,245,0.4)';
  return slot.needs_confirmation ? 'var(--orange)' : 'var(--green)';
}

function SlotCard({
  label,
  slot,
  last,
  onConfirm,
}: {
  label: string;
  slot: PantrySlot | undefined;
  last: ConsumptionEvent | undefined;
  onConfirm: (label: string, count: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(0);
  const flagged = Boolean(slot?.needs_confirmation);

  function startEdit() {
    setDraft(slot?.count ?? 0);
    setEditing(true);
  }

  async function save() {
    await onConfirm(label, draft);
    setEditing(false);
  }

  return (
    <div
      style={{
        border: `1px solid ${flagged ? 'var(--orange)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: 10,
        background: flagged ? 'var(--orange-dim)' : 'var(--panel-raised)',
        display: 'grid',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{label}</span>
        {slot?.count != null &&
          (flagged ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--orange)', fontSize: 'var(--text-xs)' }}>
              <IconCaution size={13} /> confirm
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 'var(--text-xs)' }}>
              <IconCheck size={13} /> {slot.source === 'manual' ? 'confirmed' : 'ok'}
            </span>
          ))}
      </div>
      <p style={{ fontSize: 'var(--text-sm)' }}>{slot?.item ?? 'Empty slot'}</p>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button size="sm" onClick={() => setDraft((d) => Math.max(0, d - 1))} aria-label="One less">
            −
          </Button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', minWidth: 22, textAlign: 'center' }}>{draft}</span>
          <Button size="sm" onClick={() => setDraft((d) => d + 1)} aria-label="One more">
            +
          </Button>
          <Button size="sm" variant="primary" onClick={save} style={{ marginLeft: 'auto' }}>
            Save
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 500 }}>{slot?.count ?? '–'}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>/ {slot?.capacity ?? '–'}</span>
          {last && (
            <span style={{ fontSize: 'var(--text-xs)', color: last.qty < 0 ? 'var(--text-muted)' : 'var(--green)' }}>
              {last.qty < 0 ? '↓' : '↑'}
              {Math.abs(last.qty)}
            </span>
          )}
          {slot?.count != null && (
            <Button size="sm" variant={flagged ? 'primary' : 'ghost'} onClick={startEdit} style={{ marginLeft: 'auto' }}>
              {flagged ? 'Check count' : 'Edit'}
            </Button>
          )}
        </div>
      )}
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
        {slot?.food_item_id != null ? `${slot.autonomy_days.toFixed(1)} days of crew food` : 'not assigned'}
      </p>
    </div>
  );
}

export function PantryScreen() {
  const navigate = useNavigate();
  const { context } = useStation();
  const { pantry, refresh } = usePantry();
  const [boxes, setBoxes] = useState<Record<string, [number, number, number, number]>>({});
  const [imageUrl, setImageUrl] = useState(() => api.snapshotImageUrl());
  const [scanning, setScanning] = useState(false);
  const [slotsDone, setSlotsDone] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [accurate, setAccurate] = useState(false);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [rationDays, setRationDays] = useState(30);
  const [rationPlan, setRationPlan] = useState<RationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const previousAutonomy = useRef<number | null>(null);

  const refreshFeed = () => api.getConsumption().then(setConsumption).catch(() => {});

  useEffect(() => {
    api.getGridBoxes().then(setBoxes).catch(() => {});
    refreshFeed();
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.getRations(rationDays).then(setRationPlan).catch(() => setRationPlan(null));
  }, [rationDays, pantry?.autonomy_days]);

  // remember the change of the autonomy figure so it can be shown next to it
  useEffect(() => {
    if (pantry == null) return;
    const previous = previousAutonomy.current;
    if (previous != null && Math.abs(pantry.autonomy_days - previous) >= 0.05) {
      setDelta(pantry.autonomy_days - previous);
    }
    previousAutonomy.current = pantry.autonomy_days;
  }, [pantry]);

  useEffect(() => {
    if (!scanning) return;
    const started = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [scanning]);

  useSSE((event) => {
    if (event.type === 'scan_progress' && Array.isArray(event.labels)) {
      setSlotsDone(new Set(event.labels as string[]));
    }
    if (['scan_complete', 'slot_confirmed', 'meal_logged', 'reset'].includes(event.type)) {
      refresh();
      refreshFeed();
      if (event.type !== 'meal_logged') setImageUrl(api.snapshotImageUrl());
      if (event.type === 'reset') {
        previousAutonomy.current = null;
        setDelta(null);
        setLastScan(null);
      }
    }
  });

  async function runScan() {
    setError(null);
    setScanning(true);
    setSlotsDone(new Set());
    const source = SCAN_SOURCES[sourceIndex];
    try {
      const result = await api.scanPantry({
        ...source.options,
        strategy: source.usesModel ? (accurate ? 'row' : 'full') : undefined,
      });
      const flagged = result.slots.filter((s) => s.needs_confirmation).length;
      setLastScan(
        `${result.mode === 'mock' ? 'Replay' : `Vision model, ${result.strategy === 'row' ? 'row crops' : 'single image'}`} · ${result.elapsed_s.toFixed(1)} s` +
          (flagged ? ` · ${flagged} slot${flagged > 1 ? 's' : ''} to confirm` : ''),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  async function confirm(label: string, count: number) {
    try {
      await api.confirmSlot(label, count);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const slotsByLabel = useMemo(() => {
    const map = new Map<string, PantrySlot>();
    for (const s of pantry?.slots ?? []) map.set(s.slot, s);
    return map;
  }, [pantry]);

  const lastByFoodItem = useMemo(() => {
    const map = new Map<number, ConsumptionEvent>();
    for (const event of consumption) {
      if (event.crew_member_id == null && !map.has(event.food_item_id)) map.set(event.food_item_id, event);
    }
    return map;
  }, [consumption]);

  const source = SCAN_SOURCES[sourceIndex];
  const toConfirm = (pantry?.slots ?? []).filter((s) => s.needs_confirmation);
  const resupplyIn = context?.next_resupply_in_days ?? null;
  const margin = pantry && resupplyIn != null ? pantry.autonomy_days - resupplyIn : null;
  const gaugeMax = Math.max(pantry?.autonomy_days ?? 0, resupplyIn ?? 0, 1) * 1.1;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <Panel
          title="Live pantry"
          action={
            pantry?.snapshot_ts ? (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>last scan {timeAgo(pantry.snapshot_ts, now)}</span>
            ) : undefined
          }
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ position: 'relative', width: '100%', background: '#000', lineHeight: 0 }}>
            <img src={imageUrl} alt="Latest shelf image" style={{ width: '100%', height: 'auto', display: 'block', minHeight: 120 }} />
            {Object.entries(boxes).map(([label, [x0, y0, x1, y1]]) => {
              const slot = slotsByLabel.get(label);
              const pending = scanning && !slotsDone.has(label);
              const color = pending ? 'rgba(234,240,245,0.35)' : slotColor(slot);
              return (
                <div
                  key={label}
                  style={{
                    position: 'absolute',
                    left: `${x0 * 100}%`,
                    top: `${y0 * 100}%`,
                    width: `${(x1 - x0) * 100}%`,
                    height: `${(y1 - y0) * 100}%`,
                    border: `2px solid ${color}`,
                    borderRadius: 3,
                    transition: 'border-color 240ms ease',
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: 'rgba(14,20,27,0.86)',
                      color,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {label} · {pending ? '…' : (slot?.count ?? '–')}
                    {!pending && slot?.needs_confirmation ? ' ?' : ''}
                  </span>
                </div>
              );
            })}
            <span
              style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                background: 'rgba(14,20,27,0.86)',
                color: 'var(--text-muted)',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 3,
                lineHeight: 1.3,
              }}
            >
              Test images are AI-generated · SIMULATED stock
            </span>
          </div>

          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={sourceIndex}
                onChange={(e) => setSourceIndex(Number(e.target.value))}
                disabled={scanning}
                aria-label="Scan source"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'var(--panel-raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {SCAN_SOURCES.map((m, i) => (
                  <option key={m.label} value={i}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={runScan} disabled={scanning} icon={<IconScan size={15} />}>
                {scanning ? `Scanning… ${elapsed}s` : 'Scan now'}
              </Button>
            </div>

            {scanning && source.usesModel && (
              <div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--panel-raised)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(4, (slotsDone.size / 12) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>
                  {slotsDone.size === 0 ? 'The local model is looking at the image…' : `${slotsDone.size} / 12 slots read`}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', flex: 1, minWidth: 180 }}>{source.hint}</p>
              {source.usesModel && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} disabled={scanning} />
                  Accurate mode (3 passes, about 50 s instead of 20 s)
                </label>
              )}
            </div>

            {error && (
              <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>
                {error}
              </p>
            )}
            {lastScan && !error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lastScan}</p>}
            {toConfirm.length > 0 && !scanning && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--orange)' }}>
                Please check {toConfirm.map((s) => s.slot).join(', ')} in the shelf grid below: the reading is uncertain.
              </p>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/pantry/calibration')} style={{ justifySelf: 'start', paddingLeft: 0 }}>
              Calibrate the slot grid
            </Button>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Panel title="Food autonomy for the crew of 4">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <ReadoutNumber value={pantry?.autonomy_days ?? 0} floor size="64px" durationMs={1400} />
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-lg)' }}>days</span>
              {delta != null && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-lg)',
                    color: delta < 0 ? 'var(--orange)' : 'var(--green)',
                    marginLeft: 6,
                  }}
                >
                  {delta < 0 ? '−' : '+'}
                  {Math.abs(delta).toFixed(1)} d
                </span>
              )}
            </div>

            {resupplyIn != null && pantry && (
              <div style={{ marginTop: 12 }}>
                <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'var(--panel-raised)' }}>
                  <div
                    style={{
                      width: `${(pantry.autonomy_days / gaugeMax) * 100}%`,
                      height: '100%',
                      borderRadius: 5,
                      background: margin != null && margin < 0 ? 'var(--red)' : margin != null && margin < 21 ? 'var(--orange)' : 'var(--green)',
                      transition: 'width 1400ms cubic-bezier(0.2, 0.8, 0.2, 1), background 400ms ease',
                    }}
                  />
                  <div
                    title="Next scheduled cargo"
                    style={{ position: 'absolute', top: -4, bottom: -4, left: `${(resupplyIn / gaugeMax) * 100}%`, width: 2, background: 'var(--text)' }}
                  />
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>
                  Next cargo in {resupplyIn} days (white mark):{' '}
                  <strong style={{ color: margin != null && margin < 0 ? 'var(--red)' : 'var(--text)' }}>
                    {margin != null && margin >= 0 ? `${Math.round(margin)} days of margin` : `${Math.round(Math.abs(margin ?? 0))} days short`}
                  </strong>
                </p>
              </div>
            )}
            {resupplyIn == null && context && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 10 }}>
                No resupply in this context: the stock has to last the whole leg.
              </p>
            )}

            {pantry && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                {(
                  [
                    ['Protein', pantry.macro_autonomy_days.protein],
                    ['Carbs', pantry.macro_autonomy_days.carbs],
                    ['Fat', pantry.macro_autonomy_days.fat],
                  ] as const
                ).map(([name, days]) => (
                  <div key={name} style={{ background: 'var(--panel-raised)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{Math.round(days)} d</p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-xs)', marginTop: 10 }}>
              {pantry
                ? `Crew need ${Math.round(pantry.daily_need_kcal).toLocaleString('en-US')} kcal/day (Mifflin-St Jeor × activity; NASA reference ≈ 2,870 kcal per person). ${pantry.assumption}`
                : ''}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {pantry?.expiry_warning && <StatusBadge level="orange" label={`an item expires in ${pantry.min_expiry_days} days`} />}
              {pantry && pantry.pending_meals > 0 && (
                <StatusBadge level="green" label={`${pantry.pending_meals} meal${pantry.pending_meals > 1 ? 's' : ''} logged since the last scan`} />
              )}
            </div>
          </Panel>

          <Panel
            title="Ration plan"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>last</span>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={rationDays}
                  aria-label="Days the stock must last"
                  onChange={(e) => setRationDays(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))}
                  style={{
                    width: 64,
                    background: 'var(--panel-raised)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 6px',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>days</span>
                {resupplyIn != null && (
                  <>
                    <Button size="sm" onClick={() => setRationDays(resupplyIn)}>
                      next cargo
                    </Button>
                    <Button size="sm" onClick={() => setRationDays(resupplyIn + 60)}>
                      +60 d late
                    </Button>
                  </>
                )}
              </div>
            }
          >
            {rationPlan && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <ReadoutNumber value={rationPlan.ration_pct} decimals={0} size="var(--text-2xl)" />
                  <span style={{ color: 'var(--text-muted)' }}>% of each astronaut's need</span>
                  {rationPlan.below_safety_floor ? (
                    <StatusBadge level="red" label={`below the ${rationPlan.safety_floor_pct} % safety floor`} />
                  ) : rationPlan.ration_pct < 100 ? (
                    <StatusBadge level="orange" label="rationing needed" />
                  ) : (
                    <StatusBadge level="green" label="full rations" />
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-faint)', textAlign: 'right' }}>
                      <th style={{ textAlign: 'left', fontWeight: 500, padding: '2px 0' }}>Astronaut</th>
                      <th style={{ fontWeight: 500 }}>kcal/day</th>
                      <th style={{ fontWeight: 500 }}>P / C / F (g)</th>
                      <th style={{ fontWeight: 500 }}>weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rationPlan.per_crew.map((line) => (
                      <tr key={line.crew_member_id} style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        <td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', padding: '3px 0' }}>{line.name}</td>
                        <td>{line.ration_kcal}</td>
                        <td>
                          {line.protein_g} / {line.carbs_g} / {line.fat_g}
                        </td>
                        <td style={{ color: line.weight_change_kg < -0.05 ? 'var(--orange)' : 'var(--text-muted)' }}>
                          {line.weight_change_kg > 0 ? '+' : ''}
                          {line.weight_change_kg.toFixed(1)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  Assumption: {rationPlan.assumptions[0]} The Forecasts screen runs the day-by-day version.
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Consumption feed">
            {consumption.length === 0 && (
              <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
                Nothing yet. Remove a box and scan, or log a meal from the crew app.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 170, overflow: 'auto' }}>
              {consumption.slice(0, 12).map((event) => (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--text-sm)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ color: event.qty < 0 ? 'var(--text)' : 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                      {event.qty < 0 ? '−' : '+'}
                      {Math.abs(event.qty)}
                    </span>{' '}
                    {event.food_name ?? `item #${event.food_item_id}`}
                    <span style={{ color: 'var(--text-faint)' }}>
                      {' · '}
                      {event.crew_name ? `meal, ${event.crew_name}` : event.qty < 0 ? 'seen by scan' : 'restock seen by scan'}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{timeAgo(event.ts, now)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Shelf grid: 12 slots">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {ROWS.flatMap((row) =>
            COLS.map((col) => {
              const label = `${row}${col}`;
              const slot = slotsByLabel.get(label);
              return (
                <SlotCard
                  key={label}
                  label={label}
                  slot={slot}
                  last={slot?.food_item_id ? lastByFoodItem.get(slot.food_item_id) : undefined}
                  onConfirm={confirm}
                />
              );
            }),
          )}
        </div>
      </Panel>
    </div>
  );
}

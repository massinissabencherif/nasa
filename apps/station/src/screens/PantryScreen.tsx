import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEvent, PantrySlot, RationPlan } from '@hestia/api-client';
import { IconCaution, IconCheck, IconScan, Panel, ReadoutNumber, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { usePantry } from '../lib/hooks';
import { useSSE } from '../lib/useSSE';

const ROWS = ['A', 'B', 'C'];
const COLS = ['1', '2', '3', '4'];

type ScanMode = { label: string; mode: 'mock' | 'image' | 'camera'; imagePath?: string };

const SCAN_MODES: ScanMode[] = [
  { label: 'Mock scan (instant, offline)', mode: 'mock' },
  { label: 'Fixture — full shelf', mode: 'image', imagePath: 'vision/fixtures/shelf_full.png' },
  {
    label: 'Fixture — after removing A1',
    mode: 'image',
    imagePath: 'vision/fixtures/shelf_after_removal.png',
  },
  { label: 'Live camera', mode: 'camera' },
];

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

export function PantryScreen() {
  const navigate = useNavigate();
  const { pantry, refresh } = usePantry();
  const [boxes, setBoxes] = useState<Record<string, [number, number, number, number]>>({});
  const [imageTick, setImageTick] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [rowsDone, setRowsDone] = useState<Set<string>>(new Set());
  const [scanChoice, setScanChoice] = useState(0);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [rationDays, setRationDays] = useState(30);
  const [rationPlan, setRationPlan] = useState<RationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGridBoxes().then(setBoxes).catch(() => {});
    api.getConsumption().then(setConsumption).catch(() => {});
  }, []);

  useEffect(() => {
    api.getRations(rationDays).then(setRationPlan).catch(() => setRationPlan(null));
  }, [rationDays, pantry?.snapshot_ts]);

  useSSE((event) => {
    if (event.type === 'scan_row_done' && typeof event.row === 'string') {
      setRowsDone((prev) => new Set(prev).add(event.row as string));
    }
    if (event.type === 'scan_complete') {
      refresh();
      api.getConsumption().then(setConsumption).catch(() => {});
      setImageTick((t) => t + 1);
      setScanning(false);
    }
  });

  const lastByFoodItem = useMemo(() => {
    const map = new Map<number, ConsumptionEvent>();
    for (const event of consumption) {
      if (!map.has(event.food_item_id)) map.set(event.food_item_id, event);
    }
    return map;
  }, [consumption]);

  async function runScan() {
    setError(null);
    setScanning(true);
    setRowsDone(new Set());
    const choice = SCAN_MODES[scanChoice];
    try {
      await api.scanPantry({ mode: choice.mode, image_path: choice.imagePath });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setScanning(false);
    }
  }

  const slotsByLabel = useMemo(() => {
    const map = new Map<string, PantrySlot>();
    for (const s of pantry?.slots ?? []) map.set(s.slot, s);
    return map;
  }, [pantry]);

  const itemNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of pantry?.slots ?? []) {
      if (s.food_item_id != null && s.item) map.set(s.food_item_id, s.item);
    }
    return map;
  }, [pantry]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
        <Panel title="Live pantry" bodyStyle={{ padding: 0 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1448 / 1086', background: '#000' }}>
            <img
              key={imageTick}
              src={api.snapshotImageUrl()}
              alt="Shelf camera feed"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {Object.entries(boxes).map(([label, [x0, y0, x1, y1]]) => {
              const slot = slotsByLabel.get(label);
              const rowLetter = label[0];
              const dimmed = scanning && !rowsDone.has(rowLetter);
              const flagged = slot?.needs_confirmation;
              const color = dimmed ? 'rgba(234,240,245,0.35)' : flagged ? 'var(--orange)' : 'var(--green)';
              return (
                <div
                  key={label}
                  style={{
                    position: 'absolute',
                    left: `${x0 * 100}%`,
                    top: `${y0 * 100}%`,
                    width: `${(x1 - x0) * 100}%`,
                    height: `${(y1 - y0) * 100}%`,
                    border: `1.5px solid ${color}`,
                    borderRadius: 3,
                    transition: 'border-color 240ms ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: 'rgba(14,20,27,0.82)',
                      color,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}
                  >
                    {label}:{slot?.count ?? '–'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={scanChoice}
                onChange={(e) => setScanChoice(Number(e.target.value))}
                disabled={scanning}
                style={{
                  flex: 1,
                  background: 'var(--panel-raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {SCAN_MODES.map((m, i) => (
                  <option key={m.label} value={i}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={runScan}
                disabled={scanning}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: scanning ? 'var(--panel-raised)' : 'var(--accent)',
                  color: scanning ? 'var(--text-muted)' : '#07222c',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  cursor: scanning ? 'default' : 'pointer',
                }}
              >
                <IconScan size={15} />
                {scanning ? `Scanning${rowsDone.size ? ` — row ${[...rowsDone].join(', ')} done` : '…'}` : 'Scan now'}
              </button>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
            <button
              onClick={() => navigate('/pantry/calibration')}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Calibrate grid
            </button>
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Autonomy">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <ReadoutNumber value={pantry?.autonomy_days ?? 0} />
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-lg)' }}>days</span>
            </div>
            <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-xs)', marginTop: 10 }}>
              {pantry?.assumption}
            </p>
            {pantry?.expiry_warning && (
              <div style={{ marginTop: 10 }}>
                <StatusBadge level="orange" label="item nearing expiry" />
              </div>
            )}
          </Panel>

          <Panel
            title="Ration plan"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={1}
                  value={rationDays}
                  onChange={(e) => setRationDays(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: 56,
                    background: 'var(--panel-raised)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 6px',
                    fontSize: 'var(--text-sm)',
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>days</span>
              </div>
            }
          >
            {rationPlan && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <ReadoutNumber value={rationPlan.ration_pct} decimals={0} size="var(--text-2xl)" />
                  <span style={{ color: 'var(--text-muted)' }}>% ration</span>
                  {rationPlan.below_safety_floor && <StatusBadge level="red" label="below safety floor" />}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 8 }}>
                  {rationPlan.assumptions[0]}
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Consumption">
            {consumption.length === 0 && (
              <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No scans yet.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflow: 'auto' }}>
              {consumption.slice(0, 8).map((event) => (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                  <span>
                    <span style={{ color: event.qty < 0 ? 'var(--text)' : 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                      {event.qty < 0 ? '−' : '+'}
                      {Math.abs(event.qty)}
                    </span>{' '}
                    {itemNames.get(event.food_item_id) ?? `item #${event.food_item_id}`}
                  </span>
                  <span style={{ color: 'var(--text-faint)' }}>{timeAgo(event.ts)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Shelf grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {ROWS.flatMap((row) =>
            COLS.map((col) => {
              const label = `${row}${col}`;
              const slot = slotsByLabel.get(label);
              const last = slot?.food_item_id ? lastByFoodItem.get(slot.food_item_id) : undefined;
              return (
                <div
                  key={label}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 10,
                    background: 'var(--panel-raised)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                      {label}
                    </span>
                    {slot?.count != null &&
                      (slot.needs_confirmation ? (
                        <IconCaution size={13} color="var(--orange)" />
                      ) : (
                        <IconCheck size={13} color="var(--green)" />
                      ))}
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{slot?.item ?? 'empty'}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 500 }}>
                      {slot?.count ?? '–'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                      / {slot?.capacity ?? '–'}
                    </span>
                    {last && (
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: last.qty < 0 ? 'var(--text-muted)' : 'var(--green)',
                          marginLeft: 'auto',
                        }}
                      >
                        {last.qty < 0 ? '↓' : '↑'}
                        {Math.abs(last.qty)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </Panel>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FoodItem, ShelfSlot } from '@hestia/api-client';
import { Button, Panel } from '@hestia/ui';
import { api } from '../lib/api';
import { useRefreshOn } from '../lib/useSSE';

type Box = [number, number, number, number];
type Frame = { left: number; top: number; right: number; bottom: number };

const inputStyle = {
  background: 'var(--panel-raised)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 8px',
  fontSize: 'var(--text-sm)',
} as const;

function frameOf(boxes: Record<string, Box>): Frame {
  const all = Object.values(boxes);
  if (all.length === 0) return { left: 0.05, top: 0.05, right: 0.95, bottom: 0.95 };
  return {
    left: Math.min(...all.map((b) => b[0])),
    top: Math.min(...all.map((b) => b[1])),
    right: Math.max(...all.map((b) => b[2])),
    bottom: Math.max(...all.map((b) => b[3])),
  };
}

export function CalibrationScreen() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [frame, setFrame] = useState<Frame>({ left: 0.05, top: 0.05, right: 0.95, bottom: 0.95 });
  const [slots, setSlots] = useState<ShelfSlot[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(() => api.snapshotImageUrl());
  const [message, setMessage] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', kcal: '' });
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.getGridBoxes().then((b) => {
      setBoxes(b);
      setFrame(frameOf(b));
      setSelected((current) => current ?? Object.keys(b)[0] ?? null);
    });
    api.getGrid().then(setSlots).catch(() => {});
    api.listFoodItems().then(setItems).catch(() => {});
  }, []);
  useEffect(load, [load]);
  useRefreshOn(['reference_photo', 'scan_complete', 'reset'], () => {
    setImageUrl(api.snapshotImageUrl());
    load();
  });

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setMessage(done);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  function updateField(index: number, value: number) {
    if (!selected) return;
    setBoxes((prev) => {
      const box = [...prev[selected]] as Box;
      box[index] = value;
      return { ...prev, [selected]: box };
    });
  }

  const slot = slots.find((s) => s.label === selected);
  const updateSlot = (body: { capacity?: number; food_item_id?: number }) =>
    run(async () => {
      await api.updateGridSlot(selected!, body);
      setSlots(await api.getGrid());
    }, `Slot ${selected} updated.`);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/pantry')} style={{ justifySelf: 'start', paddingLeft: 0 }}>
        ← Back to Live pantry
      </Button>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <Panel title="Reference photo and slot grid" bodyStyle={{ padding: 0 }}>
          <div style={{ position: 'relative', width: '100%', background: '#000', lineHeight: 0 }}>
            <img src={imageUrl} alt="Reference photo of the shelf" style={{ width: '100%', height: 'auto', display: 'block' }} />
            {Object.entries(boxes).map(([label, [x0, y0, x1, y1]]) => (
              <div
                key={label}
                onClick={() => setSelected(label)}
                style={{
                  position: 'absolute',
                  left: `${x0 * 100}%`,
                  top: `${y0 * 100}%`,
                  width: `${(x1 - x0) * 100}%`,
                  height: `${(y1 - y0) * 100}%`,
                  border: `2px solid ${label === selected ? 'var(--accent)' : 'rgba(234,240,245,0.55)'}`,
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'rgba(14,20,27,0.86)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: label === selected ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) run(() => api.uploadShelfPhoto(file, { scan: false }), 'Reference photo replaced. Counts were not changed.');
              }}
            />
            <Button onClick={() => fileInput.current?.click()}>Use a photo file as reference…</Button>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', flex: 1, minWidth: 200 }}>
              Or send it from a phone: crew app → Settings → Shelf camera → "Reference photo only". Take it from where the camera will
              stay, then place the grid on it.
            </p>
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 16 }}>
          <Panel title="1 · Place the whole grid">
            <div style={{ display: 'grid', gap: 10 }}>
              {(['left', 'top', 'right', 'bottom'] as const).map((side) => (
                <label key={side} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                  <span style={{ width: 52, color: 'var(--text-muted)' }}>{side}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.005}
                    value={frame[side]}
                    onChange={(e) => setFrame((f) => ({ ...f, [side]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ width: 44, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right' }}>
                    {frame[side].toFixed(3)}
                  </span>
                </label>
              ))}
              <Button
                variant="primary"
                style={{ justifySelf: 'start' }}
                onClick={() => run(async () => setBoxes(await api.setGridFrame(frame)), '12 equal slots placed inside the frame.')}
              >
                Split this frame into 3 × 4 slots
              </Button>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                Set the outer edges of the shelf, apply, then fine-tune single slots below if the compartments are not equal.
              </p>
            </div>
          </Panel>

          <Panel title={selected ? `2 · Slot ${selected}` : '2 · Select a slot'}>
            {selected && boxes[selected] && (
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                  <span style={{ width: 52, color: 'var(--text-muted)' }}>holds</span>
                  <select
                    value={slot?.food_item_id ?? 0}
                    onChange={(e) => updateSlot({ food_item_id: Number(e.target.value) })}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value={0}>nothing (expected empty)</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.kcal} kcal
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                  <span style={{ width: 52, color: 'var(--text-muted)' }}>capacity</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={slot?.capacity ?? 1}
                    onChange={(e) => updateSlot({ capacity: Math.max(1, Number(e.target.value) || 1) })}
                    style={{ ...inputStyle, width: 70, fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>a count above it asks for confirmation</span>
                </label>
                {['x0', 'y0', 'x1', 'y1'].map((fieldLabel, i) => (
                  <label key={fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                    <span style={{ width: 52, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fieldLabel}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.002}
                      value={boxes[selected][i]}
                      onChange={(e) => updateField(i, Number(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ width: 44, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right' }}>
                      {boxes[selected][i].toFixed(3)}
                    </span>
                  </label>
                ))}
                <Button style={{ justifySelf: 'start' }} onClick={() => run(() => api.updateGridBox(selected, boxes[selected]), `Box of ${selected} saved.`)}>
                  Save this box
                </Button>
              </div>
            )}
          </Panel>

          <Panel title="3 · Add a product from the real shelf">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Name, e.g. Lentil can"
                value={newItem.name}
                onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
                style={{ ...inputStyle, flex: 1, minWidth: 140 }}
              />
              <input
                type="number"
                placeholder="kcal / unit"
                value={newItem.kcal}
                onChange={(e) => setNewItem((n) => ({ ...n, kcal: e.target.value }))}
                style={{ ...inputStyle, width: 110, fontFamily: 'var(--font-mono)' }}
              />
              <Button
                disabled={newItem.name.trim().length < 2 || newItem.kcal === ''}
                onClick={() =>
                  run(async () => {
                    await api.addFoodItem({ name: newItem.name, kcal: Number(newItem.kcal) });
                    setItems(await api.listFoodItems());
                    setNewItem({ name: '', kcal: '' });
                  }, 'Product added. Assign it to a slot above.')
                }
              >
                Add
              </Button>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 8 }}>
              Energy per unit, from the label. The vision model is told the product name of each slot. A demo reset removes added
              products and slot changes.
            </p>
          </Panel>

          {message && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

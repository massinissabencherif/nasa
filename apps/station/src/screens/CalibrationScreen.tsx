import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@hestia/ui';
import { api } from '../lib/api';

type Box = [number, number, number, number];

export function CalibrationScreen() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getGridBoxes().then((b) => {
      setBoxes(b);
      setSelected(Object.keys(b)[0] ?? null);
    });
  }, []);

  function updateField(index: number, value: number) {
    if (!selected) return;
    setSaved(false);
    setBoxes((prev) => {
      const box = [...prev[selected]] as Box;
      box[index] = value;
      return { ...prev, [selected]: box };
    });
  }

  async function save() {
    if (!selected) return;
    await api.updateGridBox(selected, boxes[selected]);
    setSaved(true);
  }

  const labels = ['x0', 'y0', 'x1', 'y1'];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button
        onClick={() => navigate('/pantry')}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0, alignSelf: 'start' }}
      >
        Back to Live pantry
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
        <Panel title="Calibration" bodyStyle={{ padding: 0 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1448 / 1086', background: '#000' }}>
            <img
              src={api.snapshotImageUrl()}
              alt="Shelf camera feed"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
                  border: `1.5px solid ${label === selected ? 'var(--accent)' : 'rgba(234,240,245,0.4)'}`,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
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
        </Panel>

        <Panel title={selected ? `Slot ${selected}` : 'Select a slot'}>
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {labels.map((fieldLabel, i) => (
                <label key={fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)' }}>
                  <span style={{ width: 24, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {fieldLabel}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={boxes[selected][i]}
                    onChange={(e) => updateField(i, Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ width: 52, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right' }}>
                    {boxes[selected][i].toFixed(3)}
                  </span>
                </label>
              ))}
              <button
                onClick={save}
                style={{
                  marginTop: 6,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#07222c',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  alignSelf: 'start',
                }}
              >
                Save box
              </button>
              {saved && <p style={{ color: 'var(--green)', fontSize: 'var(--text-xs)' }}>Saved to shelf_grid.json.</p>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

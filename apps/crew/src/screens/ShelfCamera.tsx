import { useRef, useState } from 'react';
import type { ScanResponse } from '@hestia/api-client';
import { Button, IconScan, Panel, StatusBadge } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';

/** Turns this phone into the shelf camera: take a photo, the station reads it. */
export function ShelfCamera() {
  const api = useApi();
  const input = useRef<HTMLInputElement>(null);
  const [referenceOnly, setReferenceOnly] = useState(false);
  const [accurate, setAccurate] = useState(true); // a hand-held photo is read much better slot row by slot row
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    try {
      setResult(await api.uploadShelfPhoto(file, { scan: !referenceOnly, strategy: accurate ? 'row' : 'full' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const flagged = (result?.slots ?? []).filter((s) => s.needs_confirmation);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Shelf camera</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Photograph the whole shelf, straight on, from the same spot each time. The station counts each slot from your photo.
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) send(file);
        }}
      />
      <Button variant="primary" size="lg" icon={<IconScan size={20} />} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? (referenceOnly ? 'Sending…' : 'The station is reading the photo…') : 'Take a photo of the shelf'}
      </Button>

      <Panel>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
            <input type="checkbox" checked={referenceOnly} onChange={(e) => setReferenceOnly(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              Reference photo only
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                Does not count anything. Use it first, to place the slot grid on the station (Pantry → Calibrate).
              </span>
            </span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-sm)', opacity: referenceOnly ? 0.5 : 1 }}>
            <input type="checkbox" checked={accurate} disabled={referenceOnly} onChange={(e) => setAccurate(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              Accurate mode
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                Three passes, about 50 s. Recommended for a photo; untick for a quick 20-30 s read.
              </span>
            </span>
          </label>
        </div>
      </Panel>

      {error && (
        <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>
          Not read: {error}
        </p>
      )}

      {preview && <img src={preview} alt="Photo sent to the station" style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />}

      {result?.mode === 'reference' && (
        <Panel>
          <p style={{ fontSize: 'var(--text-sm)' }}>Reference photo received. Now place the grid on the station: Pantry → Calibrate the slot grid.</p>
        </Panel>
      )}

      {result?.slots && (
        <Panel title={`Inventory read in ${(result.elapsed_s ?? 0).toFixed(0)} s`}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)' }}>
            {Math.floor(result.autonomy_days ?? 0)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>days of food for the crew</span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, margin: '12px 0' }}>
            {result.slots.map((s) => (
              <div
                key={s.slot}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: s.needs_confirmation ? 'var(--orange-dim)' : 'var(--panel-raised)',
                  border: `1px solid ${s.needs_confirmation ? 'var(--orange)' : 'transparent'}`,
                }}
              >
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{s.slot}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>
                  {s.count}
                  {s.needs_confirmation ? ' ?' : ''}
                </p>
              </div>
            ))}
          </div>
          {flagged.length > 0 ? (
            <StatusBadge level="orange" label={`check ${flagged.map((s) => s.slot).join(', ')} on the station`} />
          ) : (
            <StatusBadge level="green" label="no slot to confirm" />
          )}
        </Panel>
      )}
    </div>
  );
}

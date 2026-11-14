import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsumptionEvent, PantrySlot, PantryState } from '@hestia/api-client';
import { Button, IconScan, Panel, StatusBadge } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';

type Box = [number, number, number, number];

// A live viewfinder needs a secure context: it works in the installed app
// (served from localhost inside the shell) and on localhost, not in a phone
// browser over plain http://<station-ip>. There the system camera is used.
const canPreview = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}

export function Pantry() {
  const api = useApi();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [feed, setFeed] = useState<ConsumptionEvent[]>([]);
  const [imageUrl, setImageUrl] = useState(() => api.snapshotImageUrl());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [accurate, setAccurate] = useState(true);
  const [referenceOnly, setReferenceOnly] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const snapshotTs = useRef<string | null>(null);
  const autonomy = useRef<number | null>(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const refresh = useCallback(() => {
    api
      .getPantry()
      .then((p) => {
        if (autonomy.current != null && Math.abs(p.autonomy_days - autonomy.current) >= 0.05) {
          setDelta(p.autonomy_days - autonomy.current);
        }
        autonomy.current = p.autonomy_days;
        if (p.snapshot_ts !== snapshotTs.current) {
          snapshotTs.current = p.snapshot_ts;
          setImageUrl(api.snapshotImageUrl()); // a new scan or reference photo: reload the picture
          api.getGridBoxes().then(setBoxes).catch(() => {});
        }
        setPantry(p);
      })
      .catch(() => {});
    api.getConsumption().then(setFeed).catch(() => {});
  }, [api]);

  // Live inventory: a 2.5 s poll keeps this screen in step with scans and meals
  // made anywhere (station webcam, another phone); the event stream adds
  // per-slot progress while a scan is running, where the WebView supports it.
  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 2500);
    const clock = setInterval(() => setNow(Date.now()), 5000);
    let source: EventSource | null = null;
    try {
      source = new EventSource(api.eventsUrl());
      source.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'scan_started') setProgress(0);
          if (event.type === 'scan_progress' && Array.isArray(event.labels)) setProgress(event.labels.length);
          if (['scan_complete', 'slot_confirmed', 'meal_logged', 'reference_photo', 'reset', 'grid_changed'].includes(event.type)) refresh();
        } catch {
          // ignore malformed events
        }
      };
    } catch {
      source = null; // no EventSource: polling alone still works
    }
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      source?.close();
    };
  }, [api, refresh]);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [busy]);

  const send = useCallback(
    async (photo: Blob) => {
      setBusy(true);
      setError(null);
      setInfo(null);
      setProgress(0);
      try {
        const result = await api.uploadShelfPhoto(photo, { scan: !referenceOnly, strategy: accurate ? 'row' : 'full' });
        if (result.mode === 'reference') {
          setInfo('Reference photo received. Place the slot grid on the station: Pantry → Calibrate.');
        } else {
          const flagged = (result.slots ?? []).filter((s) => s.needs_confirmation);
          setInfo(
            `Read in ${(result.elapsed_s ?? 0).toFixed(0)} s` +
              (flagged.length ? ` · check ${flagged.map((s) => s.slot).join(', ')} below` : ' · every slot looks plausible'),
          );
        }
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLiveMode(false);
      } finally {
        setBusy(false);
      }
    },
    [api, accurate, referenceOnly, refresh],
  );

  const grabFrame = useCallback(async (): Promise<Blob | null> => {
    const el = video.current;
    if (!el || !el.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  }, []);

  async function startPreview() {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      stream.current = media;
      setPreviewOn(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = media;
          video.current.play().catch(() => {});
        }
      });
    } catch {
      setError('The camera could not be opened here. Use "Take a photo" instead.');
    }
  }

  const stopPreview = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setPreviewOn(false);
    setLiveMode(false);
  }, []);
  useEffect(() => stopPreview, [stopPreview]);

  // Live mode: as soon as one read is finished, take the next frame.
  useEffect(() => {
    if (!liveMode || !previewOn) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || busyRef.current) return;
      const frame = await grabFrame();
      if (frame && !cancelled) await send(frame);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveMode, previewOn, grabFrame, send]);

  async function confirm(label: string) {
    try {
      await api.confirmSlot(label, draft);
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const slots = pantry?.slots ?? [];
  const byLabel = new Map<string, PantrySlot>(slots.map((s) => [s.slot, s]));
  const toConfirm = slots.filter((s) => s.needs_confirmation);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Pantry</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            Live inventory{pantry?.snapshot_ts ? ` · last read ${timeAgo(pantry.snapshot_ts, now)}` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', lineHeight: 1.1 }}>
            {pantry ? Math.floor(pantry.autonomy_days + 1e-9) : '–'}
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}> days</span>
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: delta != null && delta < 0 ? 'var(--orange)' : 'var(--text-faint)' }}>
            {delta != null ? `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)} d since the last read` : 'of food for the crew of 4'}
          </p>
        </div>
      </div>

      {/* camera: live viewfinder when the platform allows it, else the latest shelf picture */}
      <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', lineHeight: 0 }}>
        {previewOn ? (
          <video ref={video} playsInline muted style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <>
            <img src={imageUrl} alt="Latest picture of the shelf" style={{ width: '100%', height: 'auto', display: 'block', minHeight: 120 }} />
            {Object.entries(boxes).map(([label, [x0, y0, x1, y1]]) => {
              const slot = byLabel.get(label);
              const color = !slot || slot.count == null ? 'rgba(234,240,245,0.5)' : slot.needs_confirmation ? 'var(--orange)' : 'var(--green)';
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
                    borderRadius: 2,
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(14,20,27,0.86)', color, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, padding: '1px 3px', borderRadius: 2 }}>
                    {slot?.count ?? '–'}
                    {slot?.needs_confirmation ? '?' : ''}
                  </span>
                </div>
              );
            })}
          </>
        )}
        {busy && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '8px 10px', background: 'rgba(14,20,27,0.88)', lineHeight: 1.3 }}>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--panel-raised)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(5, (progress / 12) * 100)}%`, height: '100%', background: 'var(--accent)', transition: 'width 300ms ease' }} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              {referenceOnly ? 'Sending the photo…' : progress ? `${progress} / 12 slots read · ${elapsed}s` : `The station is reading the photo… ${elapsed}s`}
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInput}
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

      {previewOn ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <Button
            variant="primary"
            size="lg"
            icon={<IconScan size={20} />}
            disabled={busy || liveMode}
            onClick={async () => {
              const frame = await grabFrame();
              if (frame) send(frame);
            }}
          >
            {busy ? 'Reading…' : 'Capture and count'}
          </Button>
          <Button size="lg" onClick={stopPreview}>
            Close camera
          </Button>
          <Button size="lg" active={liveMode} onClick={() => setLiveMode((l) => !l)} style={{ gridColumn: '1 / -1' }}>
            {liveMode ? 'Live mode on: reading frame after frame (tap to stop)' : 'Live mode: keep reading the shelf'}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <Button variant="primary" size="lg" icon={<IconScan size={20} />} disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? 'Reading…' : 'Take a photo of the shelf'}
          </Button>
          {canPreview && (
            <Button size="lg" disabled={busy} onClick={startPreview}>
              Open the live camera
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>
          {error}
        </p>
      )}
      {info && !error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{info}</p>}

      <button
        onClick={() => setShowOptions((s) => !s)}
        aria-expanded={showOptions}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'left', padding: 0, cursor: 'pointer' }}
      >
        {showOptions ? '▾' : '▸'} Photo options
      </button>
      {showOptions && (
        <Panel>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Accurate mode
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  Three passes, about 50 s. Recommended for a hand-held photo; untick for a 20-30 s read.
                </span>
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={referenceOnly} onChange={(e) => setReferenceOnly(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Reference photo only
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  Counts nothing. Use it once to place the slot grid on the station (Pantry → Calibrate).
                </span>
              </span>
            </label>
            {!canPreview && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                The live viewfinder needs the installed app; in a browser on the base network the phone's own camera screen is used.
              </p>
            )}
          </div>
        </Panel>
      )}

      {toConfirm.length > 0 && <StatusBadge level="orange" label={`uncertain: ${toConfirm.map((s) => s.slot).join(', ')} · tap to correct`} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {slots.map((slot) => {
          const isEditing = editing === slot.slot;
          return (
            <div
              key={slot.slot}
              style={{
                padding: 10,
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${slot.needs_confirmation ? 'var(--orange)' : 'var(--border)'}`,
                background: slot.needs_confirmation ? 'var(--orange-dim)' : 'var(--panel)',
                display: 'grid',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{slot.slot}</span>
                <span>{slot.source === 'manual' ? 'confirmed' : slot.needs_confirmation ? 'to check' : ''}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.item ?? 'Empty slot'}</p>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Button size="sm" onClick={() => setDraft((d) => Math.max(0, d - 1))} aria-label="One less" style={{ padding: '8px 12px' }}>
                    −
                  </Button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', minWidth: 20, textAlign: 'center' }}>{draft}</span>
                  <Button size="sm" onClick={() => setDraft((d) => d + 1)} aria-label="One more" style={{ padding: '8px 12px' }}>
                    +
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => confirm(slot.slot)} style={{ marginLeft: 'auto', padding: '8px 10px' }}>
                    OK
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDraft(slot.count ?? 0);
                    setEditing(slot.slot);
                  }}
                  disabled={slot.count == null}
                  aria-label={`Correct the count of ${slot.slot}`}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: 'none', border: 'none', padding: 0, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)' }}>{slot.count ?? '–'}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>/ {slot.capacity}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                    {slot.food_item_id != null ? `${slot.autonomy_days.toFixed(0)} d` : ''}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {feed.length > 0 && (
        <Panel title="Latest movements">
          <div style={{ display: 'grid', gap: 6 }}>
            {feed.slice(0, 6).map((event) => (
              <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--text-sm)' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: event.qty < 0 ? 'var(--text)' : 'var(--green)' }}>
                    {event.qty < 0 ? '−' : '+'}
                    {Math.abs(event.qty)} {event.unit === 'portion' ? 'portion' : 'box'}
                    {Math.abs(event.qty) > 1 ? (event.unit === 'portion' ? 's' : 'es') : ''}
                  </span>{' '}
                  {event.food_name}
                  <span style={{ color: 'var(--text-faint)' }}> · {event.crew_name ? `meal, ${event.crew_name.split(' ')[0]}` : 'photo'}</span>
                </span>
                <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{timeAgo(event.ts, now)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
        {pantry?.assumption} Counts come from a local vision model and can be wrong: correct any slot by tapping its number.
      </p>
    </div>
  );
}

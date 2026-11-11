import { useEffect, useState } from 'react';
import type { StationInfo } from '@hestia/api-client';
import { Button, Panel, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { formatDelay, useStation } from '../lib/hooks';

const CONTEXTS = [
  { type: 'mars_base', label: 'Mars base', delay: '4-24 min (20 min used)', radiation: '0.67 mSv/day (Curiosity RAD)', resupply: 'window every ~26 months' },
  { type: 'mars_transit', label: 'Earth-Mars transit', delay: 'growing (10 min used)', radiation: '1.8 mSv/day', resupply: 'none' },
  { type: 'moon_base', label: 'Moon base', delay: '~1.3 s', radiation: '1.369 mSv/day', resupply: 'assumption: 6 months' },
  { type: 'iss', label: 'ISS', delay: '~0 s', radiation: '0.523 mSv/day', resupply: 'assumption: 2-3 months' },
];

const SCENARIOS = [
  { name: 'low-exercise', label: 'Chen Wei: low-exercise check-in', effect: 'bone zone turns orange, exercise advice' },
  { name: 'shelf-removal', label: 'Shelf: 3 boxes removed', effect: 'replay scan, autonomy 412 → 398 days' },
  { name: 'red-alert', label: 'Sofia Lindqvist: fever + high heart rate', effect: 'red alert and Earth report' },
];

export function SettingsScreen() {
  const { context, refreshContext } = useStation();
  const [info, setInfo] = useState<StationInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.getStationInfo().then(setInfo).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  async function update(action: () => Promise<unknown>) {
    await action();
    refreshContext();
  }

  async function scenario(name: string, label: string) {
    setBusy(name);
    setFeedback(null);
    try {
      await api.runScenario(name);
      setFeedback(`Done: ${label}`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Panel title="Mission context">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {CONTEXTS.map((c) => {
              const selected = context?.type === c.type;
              return (
                <button
                  key={c.type}
                  onClick={() => update(() => api.setContext(c.type))}
                  aria-pressed={selected}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? 'var(--accent-dim)' : 'var(--panel-raised)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 3,
                  }}
                >
                  <span style={{ fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--text)' }}>{c.label}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Earth delay {c.delay}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Radiation {c.radiation}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Resupply {c.resupply}</span>
                </button>
              );
            })}
          </div>
          {context && (
            <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Active: {context.label} · one-way delay {formatDelay(context.delay_s)} · {context.radiation_msv_day} mSv/day ·{' '}
              {context.next_resupply_in_days != null ? `next cargo in ${context.next_resupply_in_days} days` : 'no resupply'}. The context
              drives the Earth link delay, the forecasts, the crew reminders and the risk notes on the silhouette.
            </p>
          )}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
            Radiation and delay values are NASA references; the resupply dates for Moon and ISS and "next cargo in N days" are assumptions.
          </p>
        </Panel>

        <Panel title="Demo controls">
          <div style={{ display: 'grid', gap: 8 }}>
            {SCENARIOS.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--text-sm)' }}>{s.label}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{s.effect}</p>
                </div>
                <Button onClick={() => scenario(s.name, s.label)} disabled={busy != null}>
                  {busy === s.name ? 'Running…' : 'Run'}
                </Button>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
              <div>
                <p style={{ fontSize: 'var(--text-sm)' }}>Reset the demo</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  Erases check-ins, scans and alerts and reseeds the Mars-base baseline (412 days).
                </p>
              </div>
              <Button variant="danger" onClick={() => scenario('demo-mars', 'demo reset to the Mars-base baseline')} disabled={busy != null}>
                {busy === 'demo-mars' ? 'Resetting…' : 'Reset'}
              </Button>
            </div>
            {feedback && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{feedback}</p>}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              Each scenario goes through the same code as a real check-in or scan; they are a safety net if the phone or the camera fails
              on stage.
            </p>
          </div>
        </Panel>

        <Panel title="Earth-link clock">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[1, 10, 30, 60].map((scale) => (
              <Button key={scale} active={context?.time_scale === scale} onClick={() => update(() => api.setTimeScale(scale))}>
                ×{scale}
              </Button>
            ))}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
            Speeds up the delay of new Earth messages for a demo: at ×30 a 20 min delay takes 40 s. Messages already queued can be
            fast-forwarded on the Earth link screen.
          </p>
        </Panel>

        <Panel title="Advice text">
          <div style={{ display: 'flex', gap: 8 }}>
            <Button active={context?.use_llm_advice === false} onClick={() => update(() => api.setUseLlmAdvice(false))}>
              Fixed templates
            </Button>
            <Button active={context?.use_llm_advice === true} onClick={() => update(() => api.setUseLlmAdvice(true))}>
              Local LLM (qwen2.5vl, text mode)
            </Button>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
            Templates are the default: instant and always available. The local LLM is opt-in; its answer is checked in code (no diagnosis,
            no drug or dose, at most 4 steps, one onboard procedure) and replaced by the template if it fails a check or takes more than 8 s.
          </p>
        </Panel>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <Panel title="Crew app on the base network">
          {info ? (
            <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 16, alignItems: 'center' }}>
              <img src={api.crewQrUrl()} alt="QR code of the crew app address" width={150} height={150} style={{ borderRadius: 6, background: '#eaf0f5' }} />
              <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Scan with a phone on the same Wi-Fi, or open</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', wordBreak: 'break-all' }}>{info.crew_url}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Station API: <span style={{ fontFamily: 'var(--font-mono)' }}>{info.api_url}</span>
                </p>
                {!info.on_lan && (
                  <StatusBadge level="orange" label="no local network: join the base hotspot" />
                )}
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>The QR code is generated on this machine. No internet involved.</p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)' }}>Reading the network address…</p>
          )}
        </Panel>

        <Panel title="Local AI (Ollama)">
          {info && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge level={info.ollama.running ? 'green' : 'red'} label={info.ollama.running ? 'Ollama running' : 'Ollama not running'} />
                {info.ollama.running && (
                  <StatusBadge
                    level={info.ollama.loaded ? 'green' : info.ollama.installed ? 'orange' : 'red'}
                    label={info.ollama.loaded ? `${info.ollama.model} in memory` : info.ollama.installed ? `${info.ollama.model} not loaded yet` : `${info.ollama.model} missing`}
                  />
                )}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                {info.ollama.running
                  ? 'One model in memory at a time (16 GB machine). It is loaded when the server starts so no scan waits for a cold load.'
                  : 'Camera and test-image scans need Ollama (`ollama serve`). Everything else, including the replay scans, works without it.'}
              </p>
            </div>
          )}
        </Panel>

        <Panel title="What is simulated">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            <li>The four astronauts and their 90 days of history are invented (seeded random data).</li>
            <li>Demo scale: one box on the shelf stands for one storage lot of rations.</li>
            <li>Ground replies on the Earth link are scripted and labelled simulated.</li>
            <li>Thresholds are indicative. HESTIA is not a medical device and gives no diagnosis.</li>
            <li>The shelf test photos are AI-generated.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

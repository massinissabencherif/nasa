import { useEffect, useState } from 'react';
import type { MissionContext } from '@hestia/api-client';
import { Panel } from '@hestia/ui';
import { api } from '../lib/api';

const CONTEXT_TYPES = [
  { type: 'mars_base', label: 'Mars base' },
  { type: 'mars_transit', label: 'Earth-Mars transit' },
  { type: 'moon_base', label: 'Moon base' },
  { type: 'iss', label: 'ISS' },
];

export function SettingsScreen() {
  const [context, setContext] = useState<MissionContext | null>(null);
  const [lanIp, setLanIp] = useState<string>('…');

  useEffect(() => {
    api.getContext().then(setContext).catch(() => {});
    api
      .health()
      .then(() => setLanIp(new URL(api.baseUrl).hostname))
      .catch(() => {});
  }, []);

  async function choose(type: string) {
    const updated = await api.setContext(type);
    setContext(updated);
  }

  async function setTimeScale(scale: number) {
    const updated = await api.setTimeScale(scale);
    setContext(updated);
  }

  async function toggleLlmAdvice() {
    if (!context) return;
    const updated = await api.setUseLlmAdvice(!context.use_llm_advice);
    setContext(updated);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel title="Mission context">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CONTEXT_TYPES.map((c) => (
            <button
              key={c.type}
              onClick={() => choose(c.type)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: context?.type === c.type ? 'var(--accent-dim)' : 'var(--panel-raised)',
                color: context?.type === c.type ? 'var(--accent)' : 'var(--text)',
                fontSize: 'var(--text-sm)',
                fontWeight: context?.type === c.type ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {context && (
          <p style={{ marginTop: 14, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Earth delay {Math.round(context.delay_s / 60)} min · radiation {context.radiation_msv_day}{' '}
            mSv/day
            {context.resupply_days ? ` · resupply every ~${context.resupply_days} days` : ''}
          </p>
        )}
      </Panel>

      <Panel title="Demo time scale">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {[1, 10, 30, 60].map((scale) => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: context?.time_scale === scale ? 'var(--accent-dim)' : 'var(--panel-raised)',
                color: context?.time_scale === scale ? 'var(--accent)' : 'var(--text)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              ×{scale}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
          Scales the Earth delay for new alerts — at ×30, a 20 min delay becomes 40s. Use "Skip
          ahead" on the Earth link screen to fast-forward messages already queued.
        </p>
      </Panel>

      <Panel title="Advice generation">
        <button
          onClick={toggleLlmAdvice}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: context?.use_llm_advice ? 'var(--accent-dim)' : 'var(--panel-raised)',
            color: context?.use_llm_advice ? 'var(--accent)' : 'var(--text)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          {context?.use_llm_advice ? 'Local LLM (qwen2.5vl, text mode)' : 'Deterministic template'}
        </button>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
          Deterministic is the default and always works offline instantly. The LLM path is
          opt-in, can take a few seconds, and falls back to the template automatically if it's
          slow or Ollama is off.
        </p>
      </Panel>

      <Panel title="Station">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Server: <span style={{ fontFamily: 'var(--font-mono)' }}>{api.baseUrl}</span>
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 8 }}>
          The crew app connects to this station over the local network — point it at this
          machine's LAN IP, not {lanIp}.
        </p>
      </Panel>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { EarthMessage } from '@hestia/api-client';
import { Panel, StatusBadge } from '@hestia/ui';
import type { Level } from '@hestia/api-client';
import { api } from '../lib/api';

function countdown(targetTs: string, now: Date): string {
  const ms = new Date(targetTs).getTime() - now.getTime();
  if (ms <= 0) return 'now';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const ADVANCE_OPTIONS = [60, 300, 1200];

export function EarthScreen() {
  const [messages, setMessages] = useState<EarthMessage[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [advancing, setAdvancing] = useState(false);

  function refresh() {
    api.getEarthMessages().then(setMessages).catch(() => {});
  }

  useEffect(() => {
    refresh();
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function advance(seconds: number) {
    setAdvancing(true);
    try {
      await api.advanceEarthTime(seconds);
      refresh();
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Panel title="Demo controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Skip ahead</span>
          {ADVANCE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => advance(s)}
              disabled={advancing}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--panel-raised)',
                color: 'var(--text)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              +{s < 60 ? `${s}s` : `${Math.round(s / 60)}m`}
            </button>
          ))}
        </div>
      </Panel>

      {messages.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>No messages queued for Earth.</p>
        </Panel>
      )}
      {messages.map((msg) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(msg.payload);
        } catch {
          // leave empty
        }
        return (
          <Panel key={msg.id} title={(payload.who as string) ?? 'Crew report'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {Boolean(payload.level) && <StatusBadge level={payload.level as Level} />}
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {String(payload.indicator ?? '')} · trend {String(payload.trend_7d ?? '—')}
                {typeof payload.value === 'number' ? ` · ${payload.value}` : ''}
              </span>
            </div>

            {msg.status === 'queued' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', color: 'var(--accent)' }}>
                {countdown(msg.deliver_ts, now)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>to Earth</span>
              </div>
            )}
            {msg.status === 'delivered' && (
              <div>
                <p style={{ color: 'var(--green)', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                  Delivered to Earth
                </p>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--accent)' }}>
                  {countdown(msg.reply_ts, now)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>to reply</span>
                </div>
              </div>
            )}
            {msg.status === 'replied' && msg.reply_payload && (
              <div>
                <p style={{ color: 'var(--green)', fontSize: 'var(--text-sm)', marginBottom: 6 }}>
                  Reply received — SIMULATED
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', background: 'var(--panel-raised)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
                  {msg.reply_payload}
                </p>
              </div>
            )}

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
              Sent {new Date(msg.created_ts).toLocaleTimeString()}
            </p>
          </Panel>
        );
      })}
    </div>
  );
}

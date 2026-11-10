import { useEffect, useState } from 'react';
import type { EarthMessage } from '@hestia/api-client';
import { Panel } from '@hestia/ui';
import { api } from '../lib/api';

function remaining(deliverTs: string, now: Date): string {
  const ms = new Date(deliverTs).getTime() - now.getTime();
  if (ms <= 0) return 'arrived';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s remaining`;
}

export function EarthScreen() {
  const [messages, setMessages] = useState<EarthMessage[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    api.getEarthMessages().then(setMessages).catch(() => {});
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {messages.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>No messages queued for Earth.</p>
        </Panel>
      )}
      {messages.map((msg) => {
        const arrived = new Date(msg.deliver_ts).getTime() <= now.getTime();
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(msg.payload);
        } catch {
          // leave empty
        }
        return (
          <Panel key={msg.id} title={(payload.who as string) ?? 'Crew report'}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {Array.isArray(payload.indicators) ? (payload.indicators as string[]).join(', ') : msg.payload}
            </p>
            <div
              style={{
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-lg)',
                color: arrived ? 'var(--green)' : 'var(--accent)',
              }}
            >
              {arrived ? 'Delivered' : remaining(msg.deliver_ts, now)}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
              Sent {new Date(msg.created_ts).toLocaleTimeString()} · status: {msg.status}
            </p>
          </Panel>
        );
      })}
    </div>
  );
}

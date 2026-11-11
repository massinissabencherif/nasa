import { useCallback, useEffect, useState } from 'react';
import type { EarthMessage, Level } from '@hestia/api-client';
import { Button, indicatorLabel, Panel, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { formatDelay, useStation } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';

function remaining(targetTs: string, now: number): number {
  return Math.max(0, Math.round((new Date(targetTs).getTime() - now) / 1000));
}

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const ADVANCE_OPTIONS = [60, 300, 1200];

function Track({ msg, now }: { msg: EarthMessage; now: number }) {
  const start = new Date(msg.created_ts).getTime();
  const arrive = new Date(msg.deliver_ts).getTime();
  const back = new Date(msg.reply_ts).getTime();
  const outbound = Math.min(1, Math.max(0, (now - start) / Math.max(1, arrive - start)));
  const inbound = Math.min(1, Math.max(0, (now - arrive) / Math.max(1, back - arrive)));
  // 0 → 1 going to Earth, then 1 → 0 coming back
  const position = inbound > 0 ? 1 - inbound : outbound;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, margin: '12px 0 4px' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Base</span>
      <div style={{ position: 'relative', height: 2, background: 'var(--border)' }}>
        <div
          style={{
            position: 'absolute',
            top: -5,
            left: `calc(${position * 100}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: msg.status === 'replied' ? 'var(--green)' : 'var(--accent)',
            transition: 'left 900ms linear',
          }}
        />
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Earth</span>
    </div>
  );
}

export function EarthScreen() {
  const { context } = useStation();
  const [messages, setMessages] = useState<EarthMessage[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [advancing, setAdvancing] = useState(false);

  const refresh = useCallback(() => {
    api.getEarthMessages().then(setMessages).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(refresh, 3000); // status flips are time-based, not event-based
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [refresh]);
  useRefreshOn(['alert_created', 'reset'], refresh);

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
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {context?.label ?? '…'}: one-way delay {context ? formatDelay(context.delay_s) : '…'}
              {context && context.time_scale !== 1 ? ` (demo clock ×${context.time_scale} for new messages)` : ''}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>
              Red alerts are sent as a compact report. Until the answer comes back, the crew handles it with the onboard procedure.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Demo: skip ahead</span>
            {ADVANCE_OPTIONS.map((s) => (
              <Button key={s} size="sm" onClick={() => advance(s)} disabled={advancing}>
                +{s < 60 ? `${s} s` : `${Math.round(s / 60)} min`}
              </Button>
            ))}
          </div>
        </div>
      </Panel>

      {messages != null && messages.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-muted)' }}>
            Nothing queued for Earth. A red alert creates a report here, with a live countdown to its arrival and to the reply.
          </p>
        </Panel>
      )}

      {(messages ?? []).map((msg) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(msg.payload);
        } catch {
          // keep the raw text below
        }
        const toEarth = remaining(msg.deliver_ts, now);
        const toReply = remaining(msg.reply_ts, now);
        return (
          <Panel key={msg.id} title={`Report #${msg.id} · ${String(payload.who ?? 'crew')}`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 20 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  {Boolean(payload.level) && <StatusBadge level={payload.level as Level} />}
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    {(Array.isArray(payload.findings) ? (payload.findings as Record<string, unknown>[]) : [])
                      .map((f) => `${indicatorLabel(String(f.indicator))} ${f.value ?? ''} ${f.unit ?? ''}`.trim())
                      .join(' · ')}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)' }}>{String(payload.summary ?? msg.payload)}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
                  {msg.payload.length} characters sent · {new Date(msg.created_ts).toLocaleTimeString()}
                </p>
                <Track msg={msg} now={now} />
                {msg.status === 'replied' && msg.reply_payload && (
                  <div style={{ marginTop: 10, background: 'var(--panel-raised)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--orange)', marginBottom: 4 }}>SIMULATED GROUND REPLY</p>
                    <p style={{ fontSize: 'var(--text-sm)' }}>{msg.reply_payload}</p>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {msg.status === 'queued' && (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-display)', color: 'var(--accent)', lineHeight: 1.1 }}>{clock(toEarth)}</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>until it reaches Earth</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>reply expected in {clock(toReply)}</p>
                  </>
                )}
                {msg.status === 'delivered' && (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-display)', color: 'var(--accent)', lineHeight: 1.1 }}>{clock(toReply)}</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>received on Earth, reply on its way</p>
                  </>
                )}
                {msg.status === 'replied' && <StatusBadge level="green" label="reply received" />}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

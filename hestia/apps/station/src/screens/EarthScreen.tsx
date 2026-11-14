import { useCallback, useEffect, useState } from 'react';
import type { EarthMessage, Level } from '@hestia/api-client';
import { Button, indicatorLabel, Panel, parseServerTime, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { formatDelay, useStation } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';

function remaining(targetTs: string, now: number): number {
  return Math.max(0, Math.round((parseServerTime(targetTs) - now) / 1000));
}

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const ADVANCE_OPTIONS = [60, 300, 1200];

const time = (iso: string) => new Date(parseServerTime(iso)).toLocaleTimeString();

/** The link itself: the base on the left, Earth on the right, and the
 * message on its way out or the reply on its way back. Its position is the
 * real share of the delay already elapsed, not an animation. */
function LinkPath({ msg, now, baseLabel }: { msg: EarthMessage; now: number; baseLabel: string }) {
  const start = parseServerTime(msg.created_ts);
  const arrive = parseServerTime(msg.deliver_ts);
  const back = parseServerTime(msg.reply_ts);
  const outbound = Math.min(1, Math.max(0, (now - start) / Math.max(1, arrive - start)));
  const inbound = Math.min(1, Math.max(0, (now - arrive) / Math.max(1, back - arrive)));
  const returning = inbound > 0;
  const done = msg.status === 'replied';
  // 0 → 1 going to Earth, then 1 → 0 coming back
  const position = returning ? 1 - inbound : outbound;
  const colour = done ? 'var(--green)' : 'var(--accent)';
  const node = { width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--text-muted)', background: 'var(--bg)' } as const;
  const caption = done
    ? `Reply received at ${time(msg.reply_ts)}`
    : returning
      ? `Report received on Earth at ${time(msg.deliver_ts)}. Reply on its way back, due at ${time(msg.reply_ts)}`
      : `Report on its way to Earth, arrives at ${time(msg.deliver_ts)}. Earliest reply at ${time(msg.reply_ts)}`;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={node} />
        <div style={{ position: 'relative', height: 16 }}>
          <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 2, background: 'var(--border)' }} />
          {/* the part of the path already travelled on the current leg */}
          <div
            style={{
              position: 'absolute',
              top: 7,
              height: 2,
              background: colour,
              left: returning ? `${position * 100}%` : 0,
              width: returning ? `${(1 - position) * 100}%` : `${position * 100}%`,
              transition: 'left 900ms linear, width 900ms linear',
            }}
          />
          {[0.25, 0.5, 0.75].map((tick) => (
            <span key={tick} style={{ position: 'absolute', top: 4, left: `${tick * 100}%`, width: 1, height: 8, background: 'var(--border)' }} />
          ))}
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: `calc(${position * 100}% - 7px)`,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: colour,
              transition: 'left 900ms linear',
            }}
          />
        </div>
        <span style={node} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <span>
          {baseLabel} · sent <span style={{ fontFamily: 'var(--font-mono)' }}>{time(msg.created_ts)}</span>
        </span>
        <span>Earth</span>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{caption}</p>
    </div>
  );
}

type Finding = { indicator: string; value: number | null; unit?: string; trend_7d?: string };

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
              A compact report is queued when a value is critical or when two indicators are red together. Until the answer comes back, the crew handles it with the onboard procedure.
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
        const findings: Finding[] = Array.isArray(payload.findings) ? (payload.findings as Finding[]) : [];
        const summary = String(payload.summary ?? msg.payload);
        const actions: string[] = (Array.isArray(payload.actions_taken) ? (payload.actions_taken as string[]) : []).map((action) =>
          action.replace(/^Procedure: /, ''),
        );
        return (
          <Panel key={msg.id} title={`Report #${msg.id} · ${String(payload.who ?? 'crew')}`}>
            <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--space-6)' }}>
                <LinkPath msg={msg} now={now} baseLabel={context?.label ?? 'Base'} />
                <div style={{ textAlign: 'right', minWidth: 200 }}>
                  {msg.status === 'queued' && (
                    <>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-display)', color: 'var(--accent)', lineHeight: 1 }}>{clock(toEarth)}</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>until it reaches Earth</p>
                    </>
                  )}
                  {msg.status === 'delivered' && (
                    <>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-display)', color: 'var(--accent)', lineHeight: 1 }}>{clock(toReply)}</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>until the reply arrives</p>
                    </>
                  )}
                  {msg.status === 'replied' && <StatusBadge level="green" label="reply received" />}
                </div>
              </div>

              {msg.status === 'replied' && msg.reply_payload && (
                <div style={{ background: 'var(--panel-raised)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--orange)', marginBottom: 'var(--space-1)' }}>Simulated ground reply</p>
                  <p style={{ fontSize: 'var(--text-sm)' }}>{msg.reply_payload}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 'var(--space-6)' }}>
                <div style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {Boolean(payload.level) && <StatusBadge level={payload.level as Level} />}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>what was sent</span>
                  </div>
                  {findings.map((finding) => (
                    <div
                      key={finding.indicator}
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', alignItems: 'baseline' }}
                    >
                      <span>
                        {indicatorLabel(finding.indicator)}
                        {finding.trend_7d && <span style={{ color: 'var(--text-faint)' }}> · {finding.trend_7d} over 7 d</span>}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                        {finding.value ?? 'n/a'} {finding.unit ?? ''}
                      </span>
                    </div>
                  ))}
                  {actions.length > 0 && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Crew is applying: {actions.join(', ')}.</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 'var(--space-1)' }}>
                    Report text, {summary.length} characters (limit 600)
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{summary}</p>
                </div>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

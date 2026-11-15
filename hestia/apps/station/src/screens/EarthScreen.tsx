import { MissionIllustration, IconCrew, LoadingState, LoadError, t } from '@hestia/ui';
import { useCallback, useEffect, useState } from 'react';
import type { EarthMessage } from '@hestia/api-client';
import { Button, Panel, parseServerTime, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { formatDelay, useStation } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';
import {
  DontWaitBanner,
  DontWaitRules,
  OnboardPlan,
  TwoClocks,
  UpdateComposer,
} from '../components/earth/Waiting';

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
function LinkPath({
  msg,
  now,
  baseLabel,
  contextType,
}: {
  msg: EarthMessage;
  now: number;
  baseLabel: string;
  contextType?: string;
}) {
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
  const caption = done
    ? `${t('Reply received at', 'Réponse reçue à')} ${time(msg.reply_ts)}`
    : returning
      ? `${t('Report received on Earth at', 'Rapport reçu sur Terre à')} ${time(msg.deliver_ts)}. ${t('Reply on its way back, due at', 'Réponse en route, attendue à')} ${time(msg.reply_ts)}`
      : `${t('Report on its way to Earth, arrives at', 'Rapport en route vers la Terre, arrive à')} ${time(msg.deliver_ts)}. ${t('Earliest reply at', 'Réponse au plus tôt à')} ${time(msg.reply_ts)}`;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <>
          {contextType ? (
            <MissionIllustration context={contextType} size={48} />
          ) : (
            <IconCrew size={48} aria-hidden="true" />
          )}
        </>
        <div style={{ position: 'relative', height: 16 }}>
          <div
            style={{
              position: 'absolute',
              top: 7,
              left: 0,
              right: 0,
              height: 2,
              background: 'var(--border)',
            }}
          />
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
            <span
              key={tick}
              style={{
                position: 'absolute',
                top: 4,
                left: `${tick * 100}%`,
                width: 1,
                height: 8,
                background: 'var(--border)',
              }}
            />
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
        <MissionIllustration context="earth" size={48} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          {t(baseLabel)} {t('· sent')}{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>{time(msg.created_ts)}</span>
        </span>
        <span>{t('Earth')}</span>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{caption}</p>
    </div>
  );
}

/** An update the crew sent while waiting: its own trip, its own reply. */
function UpdateCard({
  msg,
  now,
  baseLabel,
  contextType,
}: {
  msg: EarthMessage;
  now: number;
  baseLabel: string;
  contextType?: string;
}) {
  let summary = msg.payload;
  try {
    summary = String(JSON.parse(msg.payload).summary ?? msg.payload);
  } catch {
    // raw text
  }
  const left = msg.status === 'queued' ? remaining(msg.deliver_ts, now) : remaining(msg.reply_ts, now);
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--panel-raised)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          alignItems: 'baseline',
        }}
      >
        <p style={{ fontWeight: 600 }}>
          {t('Update', 'Complément')} #{msg.id}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {msg.status === 'replied' ? (
            t('reply received', 'réponse reçue')
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{clock(left)}</span>{' '}
              {msg.status === 'queued' ? t('until it reaches Earth') : t('until the reply arrives')}
            </>
          )}
        </p>
      </div>
      <LinkPath msg={msg} now={now} baseLabel={baseLabel} contextType={contextType} />
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{summary}</p>
      {msg.status === 'replied' && msg.reply_payload && (
        <p style={{ fontSize: 'var(--text-sm)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--orange-ink)' }}>
            {t('Simulated ground reply')} ·{' '}
          </span>
          {msg.reply_payload}
        </p>
      )}
    </div>
  );
}

export function EarthScreen() {
  const { context } = useStation();
  const [messages, setMessages] = useState<EarthMessage[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [advancing, setAdvancing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [advanceError, setAdvanceError] = useState(false);

  const refresh = useCallback(() => {
    api
      .getEarthMessages()
      .then((value) => {
        setMessages(value);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
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
  useRefreshOn(['alert_created', 'reset', 'earth_changed', 'checkin'], refresh);

  async function advance(seconds: number) {
    setAdvancing(true);
    setAdvanceError(false);
    try {
      await api.advanceEarthTime(seconds);
      refresh();
    } catch {
      setAdvanceError(true);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Panel>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {context ? t(context.label) : '…'}
              {t(': one-way delay', ' : délai à sens unique')} {context ? formatDelay(context.delay_s) : '…'}
              {context && context.time_scale !== 1
                ? ` (${t('demo clock', 'horloge de démo')} ×${context.time_scale} ${t('for new messages', 'pour les nouveaux messages')})`
                : ''}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>
              {t(
                'A compact report is queued when a value is critical or when two indicators are red together. Until the answer comes back, the crew handles it with the onboard procedure.',
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {t('Demo: skip ahead')}
            </span>
            {ADVANCE_OPTIONS.map((s) => (
              <Button key={s} size="sm" onClick={() => advance(s)} disabled={advancing}>
                +{s < 60 ? `${s} s` : `${Math.round(s / 60)} min`}
              </Button>
            ))}
          </div>
        </div>
      </Panel>

      {advanceError && (
        <p role="alert" style={{ color: 'var(--red-ink)' }}>
          {t(
            'Demo time could not advance. Check the station and try again.',
            'Impossible d’avancer le temps de démo. Vérifiez la station, puis réessayez.',
          )}
        </p>
      )}
      {loadError && (
        <LoadError
          label={
            messages?.length
              ? t(
                  'Messages could not refresh. Displayed reports may be outdated.',
                  'Actualisation impossible. Les rapports affichés peuvent être anciens.',
                )
              : t(
                  'Earth reports could not load. Check the station and retry.',
                  'Impossible de charger les rapports Terre. Vérifiez la station, puis réessayez.',
                )
          }
          onRetry={refresh}
        />
      )}
      {messages == null && !loadError && (
        <LoadingState label={t('Loading Earth reports…', 'Chargement des rapports Terre…')} />
      )}
      {messages != null && messages.length === 0 && !loadError && (
        <Panel>
          <p style={{ color: 'var(--text-muted)' }}>
            {t(
              'Nothing queued for Earth. A critical reading or two red indicators queue a report, with a countdown to arrival and reply.',
            )}
          </p>
        </Panel>
      )}

      {(messages ?? [])
        .filter((m) => m.kind !== 'update')
        .map((msg) => {
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(msg.payload);
          } catch {
            // keep the raw text below
          }
          const toEarth = remaining(msg.deliver_ts, now);
          const toReply = remaining(msg.reply_ts, now);
          const summary = String(payload.summary ?? msg.payload);
          const actions: string[] = (
            Array.isArray(payload.actions_taken) ? (payload.actions_taken as string[]) : []
          ).map((action) => action.replace(/^Procedure: /, ''));
          return (
            <Panel
              key={msg.id}
              title={`${t('Report', 'Rapport')} #${msg.id} · ${String(payload.who ?? t('crew', 'équipage'))}`}
            >
              <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                  }}
                >
                  <LinkPath
                    msg={msg}
                    now={now}
                    baseLabel={
                      msg.mission_context
                        ? t(msg.mission_context.label)
                        : t('Mission not recorded', 'Mission non enregistrée')
                    }
                    contextType={msg.mission_context?.type}
                  />
                  <div style={{ textAlign: 'right', minWidth: 200 }}>
                    {msg.status === 'queued' && (
                      <>
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-display)',
                            color: 'var(--accent)',
                            lineHeight: 1,
                          }}
                        >
                          {clock(toEarth)}
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                          {t('until it reaches Earth')}
                        </p>
                      </>
                    )}
                    {msg.status === 'delivered' && (
                      <>
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-display)',
                            color: 'var(--accent)',
                            lineHeight: 1,
                          }}
                        >
                          {clock(toReply)}
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                          {t('until the reply arrives')}
                        </p>
                      </>
                    )}
                    {msg.status === 'replied' && <StatusBadge level="green" label={t('reply received')} />}
                  </div>
                </div>

                <DontWaitBanner msg={msg} />

                {msg.status === 'replied' && msg.reply_payload && (
                  <div
                    style={{
                      background: 'var(--panel-raised)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--orange)',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      {t('Simulated ground reply')} · {t('received in English', 'reçue en anglais')}
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)' }}>{msg.reply_payload}</p>
                  </div>
                )}

                <TwoClocks msg={msg} now={now} />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: 'var(--space-5)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <OnboardPlan msg={msg} now={now} onChange={refresh} />
                  <DontWaitRules msg={msg} />
                  <UpdateComposer msg={msg} onSent={refresh} />
                </div>

                {(messages ?? [])
                  .filter((u) => u.kind === 'update' && u.parent_id === msg.id)
                  .map((u) => (
                    <UpdateCard
                      key={u.id}
                      msg={u}
                      now={now}
                      baseLabel={
                        u.mission_context
                          ? t(u.mission_context.label)
                          : t('Mission not recorded', 'Mission non enregistrée')
                      }
                      contextType={u.mission_context?.type}
                    />
                  ))}

                <details>
                  <summary
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', cursor: 'pointer' }}
                  >
                    {t('Report text,')} {summary.length} {t('characters (limit 600)')} ·{' '}
                    {t('sent in English', 'envoyé en anglais')}
                  </summary>
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-muted)',
                      marginTop: 'var(--space-2)',
                    }}
                  >
                    {summary}
                  </p>
                  {actions.length > 0 && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {t('Crew is applying:')} {actions.map((action) => t(action)).join(', ')}.
                    </p>
                  )}
                </details>
              </div>
            </Panel>
          );
        })}
    </div>
  );
}

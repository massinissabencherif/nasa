import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdviceText, Button, formatAge, IconCaution, IconCheck, IconCheckin, IconClock, IconCritical, IconExercise, IconMeal, indicatorLabel, Panel, SilhouetteBody, StatusBadge, unknownCount, worstLevel, ZoneDetailPanel } from '@hestia/ui';
import type { ZoneKey } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import {
  useCrewMember,
  useCrewStatus,
  useGamification,
  useMissionContext,
  useMyAlerts,
  useReminders,
  useSelectedCrewId,
  useThresholds,
} from '../lib/hooks';
import { clearSelectedCrewId } from '../lib/profile';
import { ReactionAssessmentCard } from '../components/ReactionAssessmentCard';

export function Home() {
  const navigate = useNavigate();
  const api = useApi();
  const crewId = useSelectedCrewId();
  const crew = useCrewMember(crewId);
  const status = useCrewStatus(crewId);
  const context = useMissionContext();
  const thresholds = useThresholds();
  const gamification = useGamification(crewId);
  const reminders = useReminders(crewId);
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);
  const { alerts, refresh: refreshAlerts } = useMyAlerts(crewId);

  const openAlerts = alerts.filter((a) => !a.acked);
  const reds = openAlerts.filter((a) => a.level === 'red');
  const oranges = openAlerts.filter((a) => a.level === 'orange');
  const overall = status ? worstLevel(Object.values(status).map((z) => z.level)) : null;
  const missing = status ? unknownCount(Object.values(status).map((z) => z.level)) : 0;
  const checkinDone = reminders.find((r) => r.key === 'measurements')?.done ?? false;
  const byKey = Object.fromEntries(reminders.map((r) => [r.key, r]));
  const routine: { key: string; label: string; detail: string; icon: typeof IconCheckin; to: string; done: boolean; optional?: boolean }[] = [
    {
      key: 'checkin',
      label: 'Daily check-in',
      detail: checkinDone ? 'Recorded today. Tap to update it.' : 'How you feel and what you measured',
      icon: IconCheckin,
      to: '/checkin',
      done: checkinDone,
    },
    {
      key: 'exercise',
      label: byKey.exercise?.label ?? 'Resistive exercise, 30 min or more',
      detail: byKey.exercise?.detail ?? 'Logged in your check-in',
      icon: IconExercise,
      to: '/checkin',
      done: byKey.exercise?.done ?? false,
    },
    {
      key: 'meal',
      label: byKey.meal?.label ?? 'Log your meals',
      detail: byKey.meal?.detail ?? 'From the real stock',
      icon: IconMeal,
      to: '/meal',
      done: byKey.meal?.done ?? false,
    },
    {
      key: 'reaction',
      label: 'Reaction time test',
      detail: 'Measured by this phone, 1 to 2 minutes',
      icon: IconClock,
      to: '/assessments',
      done: false,
      optional: true,
    },
  ];
  const required = routine.filter((row) => !row.optional);
  const routineCount = required.length;
  const routineDone = required.filter((row) => row.done).length;
  // reminders that are advice, not tasks to tick
  const notes = reminders.filter((r) => r.key === 'hydration' || r.key === 'context');
  // the newest reading behind any zone, so the person sees how fresh the body view is
  const newestTs = status
    ? Object.values(status)
        .map((zone) => zone.last_ts)
        .filter((ts): ts is string => Boolean(ts))
        .sort()
        .pop() ?? null
    : null;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{crew?.name ?? '…'}</h1>
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
            {context ? ` · ${context.label}, Earth replies in ${Math.max(1, Math.round((context.delay_s * 2) / 60))} min` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            clearSelectedCrewId();
            navigate('/profile');
          }}
        >
          Switch profile
        </Button>
      </div>

      {reds.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--red-dim)', border: '1px solid var(--red)', display: 'grid', gap: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)' }}>
            <IconCritical size={18} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Red alert: {indicatorLabel(alert.indicator)}</span>
          </div>
          <AdviceText message={alert.message} />
          <Button onClick={() => api.ackAlert(alert.id).then(refreshAlerts)} style={{ justifySelf: 'start' }}>
            I have read this
          </Button>
        </div>
      ))}

      {oranges.map((alert) => (
        <div
          key={alert.id}
          style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--orange-dim)', border: '1px solid var(--orange)', display: 'grid', gap: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
            <IconCaution size={18} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Advice: {indicatorLabel(alert.indicator)}</span>
          </div>
          <AdviceText message={alert.message} />
          <Button onClick={() => api.ackAlert(alert.id).then(refreshAlerts)} style={{ justifySelf: 'start' }}>
            Got it
          </Button>
        </div>
      ))}

      <Panel title="Today's routine" action={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{routineDone} of {routineCount} done</span>}>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Once a day, record how you feel and what you measured. HESTIA turns it into your body status below and tells you what to
            do. Far from Earth, you are the first to notice a change.
          </p>
          {!checkinDone && (
            <Button variant="primary" size="lg" icon={<IconCheckin size={20} />} onClick={() => navigate('/checkin')}>
              Start my check-in · about 2 min
            </Button>
          )}
          <div style={{ display: 'grid' }}>
            {/* while the check-in is still to do, the big button above is its row */}
            {routine.filter((row) => row.key !== 'checkin' || checkinDone).map((row, index) => {
              const RowIcon = row.icon;
              return (
                <button
                  key={row.key}
                  onClick={() => navigate(row.to)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) 0',
                    minHeight: 56,
                    background: 'none',
                    border: 'none',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-soft)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: row.done ? 'var(--text-faint)' : 'var(--accent)' }}>
                    <RowIcon size={22} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{row.detail}</span>
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      fontSize: 'var(--text-xs)',
                      color: row.done ? 'var(--green-ink)' : 'var(--text-faint)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.done && <IconCheck size={14} />}
                    {row.done ? 'done' : row.optional ? 'optional' : 'to do'}
                    <span aria-hidden="true" style={{ color: 'var(--decor)', marginLeft: 'var(--space-1)' }}>›</span>
                  </span>
                </button>
              );
            })}
          </div>
          {notes.map((note) => (
            <p key={note.key} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {note.label}: {note.detail}
            </p>
          ))}
        </div>
      </Panel>

      <Panel title="Your body" action={newestTs ? <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>last reading {formatAge(newestTs)}</span> : undefined}>
        {status ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {overall === 'unknown'
                  ? 'No recent data: do a check-in'
                  : overall === 'green'
                    ? missing === 0
                      ? 'All zones nominal'
                      : `Nominal where measured, ${missing} zone${missing > 1 ? 's' : ''} without recent data`
                    : 'Some zones need attention'}
              </span>
              {overall && <StatusBadge level={overall} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SilhouetteBody status={status} width={340} showLabels selectedZone={selectedZone} onSelectZone={setSelectedZone} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Tap a zone to see what was measured, why it matters and what to do.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {(
                [
                  ['var(--green)', 'nominal'],
                  ['var(--orange)', 'advice for you'],
                  ['var(--red)', 'alert for the crew'],
                ] as const
              ).map(([colour, word]) => (
                <span key={word} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: colour }} />
                  {word}
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px dashed var(--text-faint)' }} />
                no recent data
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>Loading your status…</p>
        )}
      </Panel>

      {selectedZone && status && (
        <Panel elevated>
          <ZoneDetailPanel zone={selectedZone} status={status} thresholds={thresholds} contextType={context?.type} onClose={() => setSelectedZone(null)} />
          {selectedZone === 'brain_morale' && <Button onClick={() => navigate('/assessments')}>Open reaction time assessment</Button>}
        </Panel>
      )}

      {crewId != null && <ReactionAssessmentCard key={crewId} crewId={crewId} onOpen={() => navigate('/assessments')} />}

      {gamification && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '6px 2px' }}>
            Routine and badges: {gamification.streak}-day check-in streak
          </summary>
        <Panel title="Crew routine">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {(
              [
                [`${gamification.streak} d`, 'check-in streak'],
                [`${gamification.score}`, 'your points'],
                [gamification.rank ? `#${gamification.rank} of ${gamification.crew_size}` : 'n/a', `crew total ${gamification.crew_score}`],
              ] as const
            ).map(([value, label]) => (
              <div key={label} style={{ background: 'var(--panel-raised)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>{value}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {gamification.badges.map((badge) => (
              <div key={badge.key} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: badge.earned ? 1 : 0.55 }}>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                    border: `1px solid ${badge.earned ? 'var(--accent)' : 'var(--border)'}`,
                    color: badge.earned ? 'var(--accent)' : 'var(--text-muted)',
                    background: badge.earned ? 'var(--accent-dim)' : 'transparent',
                  }}
                >
                  {badge.earned ? '★ ' : ''}
                  {badge.label}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{badge.earned ? 'Earned' : badge.rule}</span>
              </div>
            ))}
          </div>
        </Panel>
        </details>
      )}
    </div>
  );
}

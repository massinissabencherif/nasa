import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdviceText, Button, IconCaution, IconCheck, IconCheckin, IconCritical, indicatorLabel, Panel, SilhouetteBody, StatusBadge, unknownCount, worstLevel, ZoneDetailPanel } from '@hestia/ui';
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

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{crew?.name ?? '…'}</h1>
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
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

      {!checkinDone && (
        <Button variant="primary" size="lg" icon={<IconCheckin size={20} />} onClick={() => navigate('/checkin')}>
          Do today's check-in
        </Button>
      )}

      <Panel>
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
            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Tap a body zone or its label</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>Loading your status…</p>
        )}
      </Panel>

      {selectedZone && status && (
        <Panel>
          <ZoneDetailPanel zone={selectedZone} status={status} thresholds={thresholds} contextType={context?.type} onClose={() => setSelectedZone(null)} />
        </Panel>
      )}

      {reminders.length > 0 && (
        <Panel title="Today">
          <div style={{ display: 'grid', gap: 10 }}>
            {reminders.map((r) => (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 10, alignItems: 'start' }}>
                <span
                  aria-hidden
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `1.5px solid ${r.done ? 'var(--green)' : 'var(--border)'}`,
                    color: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  {r.done && <IconCheck size={12} />}
                </span>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', color: r.done ? 'var(--text-muted)' : 'var(--text)' }}>
                    {r.label}
                    {r.done ? ' (done)' : ''}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

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

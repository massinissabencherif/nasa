import { ScienceSources } from '@hestia/ui';
import { LoadingState, LoadError } from '@hestia/ui';
import { t, dateLocale } from '@hestia/ui';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdviceText,
  Button,
  DetailSheet,
  ZONE_META,
  formatAge,
  IconCaution,
  IconCheckin,
  IconReaction,
  IconHistory,
  IconCritical,
  indicatorLabel,
  Panel,
  SilhouetteBody,
  StatusBadge,
  unknownCount,
  worstLevel,
  ZoneDetailPanel,
} from '@hestia/ui';
import type { ZoneKey } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import {
  useCrewMember,
  useCrewStatusState,
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
  const { data: status, error: statusError, refresh: refreshStatus } = useCrewStatusState(crewId);
  const context = useMissionContext();
  const thresholds = useThresholds();
  const reminders = useReminders(crewId);
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);
  const { alerts, refresh: refreshAlerts } = useMyAlerts(crewId);

  const openAlerts = alerts.filter((a) => !a.acked);
  const reds = openAlerts.filter((a) => a.level === 'red');
  const oranges = openAlerts.filter((a) => a.level === 'orange');
  const overall = status ? worstLevel(Object.values(status).map((z) => z.level)) : null;
  const missing = status ? unknownCount(Object.values(status).map((z) => z.level)) : 0;
  const checkinDone = reminders.find((r) => r.key === 'measurements')?.done ?? false;
  const bodyView = useRef<HTMLDivElement>(null);
  const getContextAnchor = useCallback(
    () => bodyView.current?.querySelector(`[data-zone-context="${selectedZone}"]`) ?? null,
    [selectedZone],
  );
  // the newest reading behind any zone, so the person sees how fresh the body view is
  const newestTs = status
    ? (Object.values(status)
        .map((zone) => zone.last_ts)
        .filter((ts): ts is string => Boolean(ts))
        .sort()
        .pop() ?? null)
    : null;

  return (
    <div className="hz-home" data-context-open={selectedZone !== null}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{crew?.name ?? '…'}</h1>
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
            {new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'short' })}
            {context ? ` · ${t(context.label)}` : ''}
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
          {t('Switch profile')}
        </Button>
      </div>

      {reds.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'var(--red-dim)',
            border: '1px solid var(--red)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)' }}>
            <IconCritical size={18} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {t('Red alert:')} {indicatorLabel(alert.indicator)}
            </span>
          </div>
          <AdviceText message={alert.message} />
          <Button onClick={() => api.ackAlert(alert.id).then(refreshAlerts)} style={{ justifySelf: 'start' }}>
            {t('I have read this')}
          </Button>
        </div>
      ))}

      {oranges.map((alert) => (
        <div
          key={alert.id}
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'var(--orange-dim)',
            border: '1px solid var(--orange)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
            <IconCaution size={18} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>
              {t('Advice:')} {indicatorLabel(alert.indicator)}
            </span>
          </div>
          <AdviceText message={alert.message} />
          <Button onClick={() => api.ackAlert(alert.id).then(refreshAlerts)} style={{ justifySelf: 'start' }}>
            {t('Got it')}
          </Button>
        </div>
      ))}

      <nav className="hz-daily-actions" aria-label={t('Daily actions', 'Actions du jour')}>
        <Button
          variant="primary"
          size="lg"
          icon={<IconCheckin size={20} />}
          onClick={() => navigate('/checkin')}
        >
          {t(checkinDone ? 'Update my check-in' : 'Start my check-in')}
        </Button>
        <p>{t(checkinDone ? 'Recorded today' : 'How you feel and what you measured · about 2 min')}</p>
        <div className="hz-daily-secondary">
          <Button
            size="lg"
            style={{ paddingInline: 'var(--space-2)' }}
            icon={<IconReaction size={18} />}
            onClick={() => navigate('/assessments')}
          >
            {t('Reaction test', 'Test de réaction')}
          </Button>
          <Button
            size="lg"
            style={{ paddingInline: 'var(--space-2)' }}
            icon={<IconHistory size={18} />}
            onClick={() => navigate('/assessments/history')}
          >
            {t('Results', 'Résultats')}
          </Button>
        </div>
        <p>{t('Reaction test: optional', 'Test de réaction : facultatif')}</p>
      </nav>

      <Panel
        title={t('Your body')}
        action={
          newestTs ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {t('last reading')} {formatAge(newestTs)}
            </span>
          ) : undefined
        }
      >
        {status ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {overall === 'unknown'
                  ? t('No recent data: do a check-in')
                  : overall === 'green'
                    ? missing === 0
                      ? t('All zones nominal')
                      : t(
                          `Nominal where measured; ${missing} zones without recent data`,
                          `Normal pour les zones mesurées ; ${missing} zones sans donnée récente`,
                        )
                    : t('Some zones need attention')}
              </span>
              {overall && <StatusBadge level={overall} />}
            </div>
            <div ref={bodyView} style={{ display: 'flex', justifyContent: 'center' }}>
              <SilhouetteBody
                status={status}
                width={340}
                showLabels
                selectedZone={selectedZone}
                motionSuppressed={selectedZone !== null}
                onSelectZone={setSelectedZone}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {t('Tap a zone to see what was measured, why it matters and what to do.')}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-faint)',
              }}
            >
              {(
                [
                  ['var(--green)', 'nominal'],
                  ['var(--orange)', 'advice for you'],
                  ['var(--red)', 'alert for the crew'],
                ] as const
              ).map(([colour, word]) => (
                <span
                  key={t(word)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: colour }}
                  />
                  {t(word)}
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: '1.5px dashed var(--text-faint)',
                  }}
                />
                {t('no recent data')}
              </span>
            </div>
          </div>
        ) : (
          !statusError && <LoadingState label={t('Loading your status…')} />
        )}
        {statusError && (
          <LoadError
            label={t(
              'Status could not refresh. Any displayed readings may be outdated.',
              'Actualisation impossible. Les mesures affichées peuvent être anciennes.',
            )}
            onRetry={refreshStatus}
          />
        )}
      </Panel>

      {selectedZone && status && (
        <DetailSheet
          title={t(ZONE_META[selectedZone].label)}
          onClose={() => setSelectedZone(null)}
          getContextAnchor={getContextAnchor}
        >
          <ZoneDetailPanel
            zone={selectedZone}
            status={status}
            thresholds={thresholds}
            contextType={context?.type}
            hideHeading
          />
        </DetailSheet>
      )}

      <ScienceSources />
    </div>
  );
}

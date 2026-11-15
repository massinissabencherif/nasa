import { ScienceSources } from '@hestia/ui';
import { t } from '@hestia/ui';
import { Link } from 'react-router-dom';
import { Panel, SilhouetteBody, StatusBadge, ZONE_META, ZONES, worstLevel, measureIcon } from '@hestia/ui';
import { crewVitals, freshness, FRESHNESS_LABEL } from '../lib/crewVitals';
import type { ZoneLevel } from '@hestia/api-client';
import { useCrew, useCrewStatuses } from '../lib/hooks';

export function CrewScreen() {
  const crew = useCrew();
  const statuses = useCrewStatuses(crew);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        {t(
          'Open an astronaut’s profile to review their readings, see what needs attention and follow the relevant steps.',
        )}
      </p>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}
      >
        {crew.map((member) => {
          const status = statuses[member.id];
          const fresh = status ? freshness(Object.values(status)) : null;
          const worst: ZoneLevel = status ? worstLevel(Object.values(status).map((z) => z.level)) : 'unknown';
          // one zone (the cumulative dose) never goes stale: it must not make an old board look nominal
          const overall: ZoneLevel =
            (fresh === 'stale' || fresh === 'no_data') && worst !== 'red' && worst !== 'orange'
              ? 'unknown'
              : worst;
          const attention = status
            ? ZONES.filter((z) => status[z].level === 'orange' || status[z].level === 'red')
            : [];
          const vitals = status ? crewVitals(status) : [];
          return (
            <Link
              key={member.id}
              to={`/crew/${member.id}`}
              className="hz-crew-card"
              style={{
                display: 'grid',
                gridTemplateColumns: '112px minmax(0, 1fr)',
                alignItems: 'center',
                gap: 'var(--space-5)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--panel)',
                border: `1px solid ${overall === 'red' ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--text)',
                textAlign: 'left',
              }}
            >
              <SilhouetteBody status={status ?? null} interactive={false} width={112} />
              <div style={{ display: 'grid', gap: 'var(--space-3)', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{member.name}</p>
                  {status && (
                    <StatusBadge
                      level={overall}
                      label={overall === 'unknown' ? (fresh === 'stale' ? 'outdated' : 'no data') : undefined}
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-faint)',
                    marginTop: 'calc(-1 * var(--space-2))',
                  }}
                >
                  {t(member.sex === 'M' ? 'Male' : 'Female')} · {member.age} {t('y ·')} {member.height_cm}{' '}
                  {t('cm ·')} {member.weight_kg} {t('kg')}
                </p>
                <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                  {vitals.map((vital) => {
                    const VitalIcon = measureIcon(vital.key);
                    return (
                      <div
                        key={vital.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '18px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-flex',
                            color:
                              vital.level === 'red'
                                ? 'var(--red-ink)'
                                : vital.level === 'orange'
                                  ? 'var(--orange-ink)'
                                  : vital.level
                                    ? 'var(--green-ink)'
                                    : 'var(--decor)',
                          }}
                        >
                          {VitalIcon && <VitalIcon size={16} />}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{t(vital.label)}</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            color:
                              vital.level === 'red'
                                ? 'var(--red-ink)'
                                : vital.level === 'orange'
                                  ? 'var(--orange-ink)'
                                  : vital.level
                                    ? 'var(--text)'
                                    : 'var(--text-faint)',
                          }}
                        >
                          {t(vital.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: attention.length ? 'var(--text)' : 'var(--text-muted)',
                    minHeight: 16,
                  }}
                >
                  {attention.length > 0 &&
                    `${t('Needs attention:')} ${attention.map((z) => t(ZONE_META[z].label)).join(', ')} · `}
                  {fresh ? (
                    <span
                      style={{
                        color: fresh === 'stale' || fresh === 'no_data' ? 'var(--orange-ink)' : undefined,
                      }}
                    >
                      {t(FRESHNESS_LABEL[fresh])}
                    </span>
                  ) : (
                    t('Loading…')
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <ScienceSources />
      {crew.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>{t('Loading the crew…')}</p>
        </Panel>
      )}
    </div>
  );
}

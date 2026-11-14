import { useState } from 'react';
import { formatAge, Panel, ReactionHistory, SilhouetteBody, StatusBadge, StatusDot, ZoneDetailPanel, ZONE_META, ZONES, worstLevel } from '@hestia/ui';
import { api } from '../lib/api';
import { crewVitals, newestReading } from '../lib/crewVitals';
import type { ZoneLevel } from '@hestia/api-client';
import type { ZoneKey } from '@hestia/ui';
import { useCrew, useCrewStatuses, useStation, useThresholds } from '../lib/hooks';

const ORDER: Record<ZoneLevel, number> = { red: 0, orange: 1, unknown: 2, green: 3 };

export function CrewScreen() {
  const { context } = useStation();
  const crew = useCrew();
  const statuses = useCrewStatuses(crew);
  const thresholds = useThresholds();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);

  function toggle(memberId: number) {
    if (expanded === memberId) {
      setExpanded(null);
      setSelectedZone(null);
      return;
    }
    setExpanded(memberId);
    const status = statuses[memberId];
    const worstZone = status ? [...ZONES].sort((a, b) => ORDER[status[a].level] - ORDER[status[b].level])[0] : null;
    setSelectedZone(worstZone);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Four fictional astronauts, simulated data. Each silhouette shows the latest check-in. Open a card, then click a body zone
        to see what was measured, the hazard behind it and what to do.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
        {crew.map((member) => {
          const status = statuses[member.id];
          const overall: ZoneLevel = status ? worstLevel(Object.values(status).map((z) => z.level)) : 'unknown';
          const attention = status ? ZONES.filter((z) => status[z].level !== 'green') : [];
          const vitals = status ? crewVitals(status) : [];
          const isOpen = expanded === member.id;
          return (
            <button
              key={member.id}
              onClick={() => toggle(member.id)}
              aria-expanded={isOpen}
              style={{
                display: 'grid',
                gridTemplateColumns: '112px minmax(0, 1fr)',
                alignItems: 'center',
                gap: 'var(--space-5)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--panel)',
                border: `1px solid ${isOpen ? 'var(--accent)' : overall === 'red' ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--text)',
                textAlign: 'left',
              }}
            >
              <SilhouetteBody status={status ?? null} interactive={false} width={112} />
              <div style={{ display: 'grid', gap: 'var(--space-3)', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{member.name}</p>
                  {status && <StatusBadge level={overall} />}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 'calc(-1 * var(--space-2))' }}>
                  {member.sex === 'M' ? 'Male' : 'Female'} · {member.age} y · {member.height_cm} cm · {member.weight_kg} kg
                </p>
                <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                  {vitals.map((vital) => (
                    <div
                      key={vital.label}
                      style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
                    >
                      {vital.level ? <StatusDot level={vital.level} /> : <span />}
                      <span style={{ color: 'var(--text-muted)' }}>{vital.label}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          color: vital.level === 'red' ? 'var(--red)' : vital.level === 'orange' ? 'var(--orange)' : vital.level ? 'var(--text)' : 'var(--text-faint)',
                        }}
                      >
                        {vital.value}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: attention.length ? 'var(--text)' : 'var(--text-faint)', minHeight: 16 }}>
                  {attention.length > 0 && `Needs attention: ${attention.map((z) => ZONE_META[z].label).join(', ')} · `}
                  {status ? `last reading ${formatAge(newestReading(status))}` : 'loading'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {crew.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>Loading the crew…</p>
        </Panel>
      )}

      {expanded != null && statuses[expanded] && (
        <Panel title={`${crew.find((c) => c.id === expanded)?.name} · body status`}>
          <div style={{ display: 'grid', gridTemplateColumns: '400px minmax(0, 1fr)', gap: 28 }}>
            <div style={{ display: 'grid', justifyItems: 'center', alignContent: 'start', gap: 8 }}>
              <SilhouetteBody status={statuses[expanded]} width={400} showLabels selectedZone={selectedZone} onSelectZone={setSelectedZone} />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Click a zone or its label</p>
            </div>
            {selectedZone && (
              <ZoneDetailPanel zone={selectedZone} status={statuses[expanded]} thresholds={thresholds} contextType={context?.type} />
            )}
          </div>
        </Panel>
      )}
      {expanded != null && <ReactionHistory api={api} crewId={expanded} />}
    </div>
  );
}

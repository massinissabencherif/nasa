import { useState } from 'react';
import { Panel, SilhouetteBody, StatusBadge, ZoneDetailPanel, ZONE_META, ZONES, worstLevel } from '@hestia/ui';
import type { Level } from '@hestia/api-client';
import type { ZoneKey } from '@hestia/ui';
import { useCrew, useCrewStatuses, useStation, useThresholds } from '../lib/hooks';

const ORDER: Record<Level, number> = { red: 0, orange: 1, green: 2 };

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
        Four fictional astronauts, SIMULATED data. Each silhouette is coloured from the latest check-in; open a card and click a body
        zone for the indicators, the hazard and the advised action.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {crew.map((member) => {
          const status = statuses[member.id];
          const overall: Level = status ? worstLevel(Object.values(status).map((z) => z.level)) : 'green';
          const attention = status ? ZONES.filter((z) => status[z].level !== 'green') : [];
          const isOpen = expanded === member.id;
          return (
            <button
              key={member.id}
              onClick={() => toggle(member.id)}
              aria-expanded={isOpen}
              style={{
                display: 'grid',
                justifyItems: 'center',
                gap: 8,
                padding: 16,
                background: 'var(--panel)',
                border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--text)',
              }}
            >
              <SilhouetteBody status={status ?? null} interactive={false} width={84} />
              <p style={{ fontWeight: 600 }}>{member.name}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                {member.sex === 'M' ? 'Male' : 'Female'} · {member.age} y · {member.height_cm} cm · {member.weight_kg} kg
              </p>
              {status && <StatusBadge level={overall} />}
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minHeight: 16 }}>
                {attention.length ? attention.map((z) => ZONE_META[z].label).join(', ') : status ? 'all zones nominal' : ''}
              </p>
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
    </div>
  );
}

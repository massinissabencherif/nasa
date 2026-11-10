import { useState } from 'react';
import { Panel, SilhouetteBody, StatusBadge, ZoneDetailPanel, ZONES, worstLevel } from '@hestia/ui';
import type { Level } from '@hestia/api-client';
import type { ZoneKey } from '@hestia/ui';
import { useCrew, useCrewStatuses, useLatestMeasurements, useThresholds } from '../lib/hooks';

export function CrewScreen() {
  const crew = useCrew();
  const statuses = useCrewStatuses(crew);
  const thresholds = useThresholds();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);
  const latest = useLatestMeasurements(expanded);

  function toggle(memberId: number) {
    if (expanded === memberId) {
      setExpanded(null);
      setSelectedZone(null);
      return;
    }
    setExpanded(memberId);
    const status = statuses[memberId];
    const worstZone = status
      ? ZONES.find((z) => status[z]?.level !== 'green') ?? ZONES[0]
      : null;
    setSelectedZone(worstZone);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {crew.map((member) => {
        const status = statuses[member.id];
        const overall: Level = status ? worstLevel(Object.values(status).map((z) => z.level)) : 'green';
        const isOpen = expanded === member.id;
        return (
          <Panel key={member.id} bodyStyle={{ padding: 0 }}>
            <button
              onClick={() => toggle(member.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <SilhouetteBody status={status ?? null} interactive={false} width={32} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600 }}>{member.name}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  {member.sex === 'M' ? 'Male' : 'Female'} · {member.age}y · {member.height_cm} cm
                </p>
              </div>
              {status && <StatusBadge level={overall} />}
            </button>
            {isOpen && status && (
              <div
                style={{
                  borderTop: '1px solid var(--border-soft)',
                  padding: 20,
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  gap: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <SilhouetteBody
                    status={status}
                    width={150}
                    selectedZone={selectedZone}
                    onSelectZone={setSelectedZone}
                  />
                </div>
                {selectedZone && (
                  <ZoneDetailPanel
                    zone={selectedZone}
                    status={status}
                    latest={latest}
                    thresholds={thresholds}
                  />
                )}
              </div>
            )}
          </Panel>
        );
      })}
      {crew.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>Waiting for the server…</p>
        </Panel>
      )}
    </div>
  );
}

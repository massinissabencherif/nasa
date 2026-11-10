import { useState } from 'react';
import { Panel, StatusBadge, StatusDot, worstLevel } from '@hestia/ui';
import type { Level } from '@hestia/api-client';
import { useCrew, useCrewStatuses } from '../lib/hooks';

const ZONE_LABELS: Record<string, string> = {
  brain_morale: 'Brain / morale',
  eyes_sans: 'Eyes (SANS)',
  heart: 'Heart',
  bones: 'Bones',
  muscles: 'Muscles',
  immunity: 'Immunity',
  skin: 'Skin',
  digestive_nutrition: 'Digestive / nutrition',
};

export function CrewScreen() {
  const crew = useCrew();
  const statuses = useCrewStatuses(crew);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {crew.map((member) => {
        const status = statuses[member.id];
        const overall: Level = status ? worstLevel(Object.values(status).map((z) => z.level)) : 'green';
        const isOpen = expanded === member.id;
        return (
          <Panel key={member.id} bodyStyle={{ padding: 0 }}>
            <button
              onClick={() => setExpanded(isOpen ? null : member.id)}
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
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--panel-raised)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {member.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')}
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
                  padding: 16,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {Object.entries(status).map(([zone, zoneStatus]) => (
                  <div
                    key={zone}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--panel-raised)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusDot level={zoneStatus.level} />
                      <span style={{ fontSize: 'var(--text-sm)' }}>{ZONE_LABELS[zone] ?? zone}</span>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                      {zoneStatus.hazard}
                    </span>
                  </div>
                ))}
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

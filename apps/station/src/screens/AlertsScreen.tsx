import { useEffect, useState } from 'react';
import type { Alert, CrewMember } from '@hestia/api-client';
import { Panel, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { useCrew } from '../lib/hooks';

function crewName(crew: CrewMember[], id: number): string {
  return crew.find((c) => c.id === id)?.name ?? `crew #${id}`;
}

export function AlertsScreen() {
  const crew = useCrew();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  function refresh() {
    api.getAlerts().then(setAlerts).catch(() => {});
  }

  useEffect(refresh, []);

  async function ack(id: number) {
    await api.ackAlert(id);
    refresh();
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {alerts.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)' }}>No alerts.</p>
        </Panel>
      )}
      {alerts.map((alert) => (
        <Panel key={alert.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <StatusBadge level={alert.level} />
                <span style={{ fontWeight: 600 }}>{crewName(crew, alert.crew_member_id)}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  {alert.indicator} · {new Date(alert.ts).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{alert.message}</p>
              {alert.sent_to_earth && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 6 }}>
                  Sent to Earth
                </p>
              )}
            </div>
            {!alert.acked ? (
              <button
                onClick={() => ack(alert.id)}
                style={{
                  alignSelf: 'start',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Acknowledge
              </button>
            ) : (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', alignSelf: 'start' }}>
                Acknowledged
              </span>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

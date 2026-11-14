import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Alert } from '@hestia/api-client';
import { Button, indicatorLabel, Panel, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { useCrew } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';

export function AlertsScreen() {
  const navigate = useNavigate();
  const crew = useCrew();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  const refresh = useCallback(() => {
    api.getAlerts().then(setAlerts).catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);
  useRefreshOn(['alert_created', 'alert_acked', 'checkin', 'reset'], refresh);

  const name = (id: number) => crew.find((c) => c.id === id)?.name ?? `crew #${id}`;
  const active = (alerts ?? []).filter((a) => !a.resolved);
  const past = (alerts ?? []).filter((a) => a.resolved);

  function card(alert: Alert) {
    return (
      <Panel key={alert.id} style={{ opacity: alert.resolved ? 0.6 : 1, borderColor: !alert.resolved && alert.level === 'red' ? 'var(--red)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <StatusBadge level={alert.level} />
              <span style={{ fontWeight: 600 }}>
                {name(alert.crew_member_id)} · {indicatorLabel(alert.indicator)}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{new Date(alert.ts).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{alert.message}</p>
            {alert.sent_to_earth && (
              <Button size="sm" variant="ghost" onClick={() => navigate('/earth')} style={{ marginTop: 8, paddingLeft: 0, color: 'var(--accent)' }}>
                Report queued for Earth: open Earth link
              </Button>
            )}
          </div>
          <div style={{ flexShrink: 0 }}>
            {alert.resolved ? (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Resolved</span>
            ) : alert.acked ? (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Acknowledged</span>
            ) : (
              <Button onClick={() => api.ackAlert(alert.id).then(refresh)}>Acknowledge</Button>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Green: nothing. Orange: self-care advice for the astronaut. Red: crew alert on station and mobile, plus a compact report queued
        for Earth. Only a change of level raises a new alert. Advice is indicative, never a diagnosis.
      </p>
      {alerts != null && active.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-muted)' }}>No active alert. Alerts appear here as soon as a check-in crosses a threshold.</p>
        </Panel>
      )}
      {active.map(card)}
      {past.length > 0 && <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)', marginTop: 8 }}>Resolved</h2>}
      {past.map(card)}
    </div>
  );
}

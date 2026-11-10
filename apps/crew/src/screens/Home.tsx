import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheckin, IconSettings, Panel, SilhouetteBody, StatusDot, worstLevel, ZoneDetailPanel } from '@hestia/ui';
import type { Measurement } from '@hestia/api-client';
import type { ZoneKey } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { useCrewMember, useCrewStatus, useLatestMeasurements, useSelectedCrewId, useThresholds } from '../lib/hooks';
import { clearSelectedCrewId } from '../lib/profile';

const REMINDER_FIELDS: { type: string; label: string }[] = [
  { type: 'exercise_min', label: 'Log resistive exercise — the main defense against bone loss' },
  { type: 'sleep_h', label: 'Log last night’s sleep' },
  { type: 'weight', label: 'Step on the scale' },
];

export function Home() {
  const navigate = useNavigate();
  const api = useApi();
  const crewId = useSelectedCrewId();
  const crew = useCrewMember(crewId);
  const status = useCrewStatus(crewId);
  const latest = useLatestMeasurements(crewId);
  const thresholds = useThresholds();
  const [todayTypes, setTodayTypes] = useState<Set<string>>(new Set());
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);

  useEffect(() => {
    if (crewId == null) return;
    api.getMeasurements(crewId, { days: 1 }).then((rows: Measurement[]) => {
      setTodayTypes(new Set(rows.map((r) => r.type)));
    });
  }, [api, crewId]);

  const overall = status ? worstLevel(Object.values(status).map((z) => z.level)) : null;
  const missing = REMINDER_FIELDS.filter((f) => !todayTypes.has(f.type));

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{crew?.name ?? '…'}</h1>
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => {
              clearSelectedCrewId();
              navigate('/profile');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
          >
            Switch profile
          </button>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 0 }}
          >
            <IconSettings size={18} />
          </button>
        </div>
      </div>

      {!todayTypes.has('mood') && (
        <button
          onClick={() => navigate('/checkin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent)',
            color: '#07222c',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconCheckin size={20} />
          Do today's check-in
        </button>
      )}

      <Panel>
        {status ? (
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {overall && <StatusDot level={overall} size={10} />}
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {overall === 'green' ? 'All systems nominal' : 'Some zones need attention'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SilhouetteBody status={status} width={190} selectedZone={selectedZone} onSelectZone={setSelectedZone} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
              Tap a zone for details
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>Loading…</p>
        )}
      </Panel>

      {selectedZone && status && (
        <Panel>
          <ZoneDetailPanel
            zone={selectedZone}
            status={status}
            latest={latest}
            thresholds={thresholds}
            onClose={() => setSelectedZone(null)}
          />
        </Panel>
      )}

      {missing.length > 0 && (
        <Panel title="Reminders">
          <div style={{ display: 'grid', gap: 8 }}>
            {missing.map((f) => (
              <p key={f.type} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {f.label}
              </p>
            ))}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Drink water on a schedule — thirst cues are unreliable in microgravity.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

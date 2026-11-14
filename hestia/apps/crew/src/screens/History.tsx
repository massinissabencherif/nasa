import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Thresholds } from '@hestia/api-client';
import { Panel } from '@hestia/ui';
import { IndicatorChart } from '../components/IndicatorChart';
import { useApi } from '../lib/ApiProvider';
import { useMeasurements, useSelectedCrewId } from '../lib/hooks';

const INDICATORS: { key: string; label: string; unit: string }[] = [
  { key: 'systolic_bp', label: 'Blood pressure', unit: 'mmHg' },
  { key: 'heart_rate', label: 'Heart rate', unit: 'bpm' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'sleep_h', label: 'Sleep', unit: 'h' },
  { key: 'mood', label: 'Mood', unit: '1-5' },
  { key: 'reaction_ms', label: 'Legacy reaction', unit: 'ms' },
  { key: 'exercise_min', label: 'Exercise', unit: 'min' },
];

export function History() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const [selected, setSelected] = useState('systolic_bp');
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);

  useEffect(() => {
    api.getThresholds().then(setThresholds).catch(() => {});
  }, [api]);

  const data = useMeasurements(crewId, selected, 30);
  const diastolic = useMeasurements(crewId, 'diastolic_bp', 30);
  const indicator = INDICATORS.find((i) => i.key === selected)!;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>History</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Bands show the indicative green, orange and red ranges. Past values are SIMULATED.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {INDICATORS.map((ind) => (
          <button
            key={ind.key}
            onClick={() => setSelected(ind.key)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${selected === ind.key ? 'var(--accent)' : 'var(--border)'}`,
              background: selected === ind.key ? 'var(--accent-dim)' : 'var(--panel)',
              color: selected === ind.key ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: selected === ind.key ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {ind.label}
          </button>
        ))}
      </div>

      <Panel title={`${indicator.label} · last 30 days`}>
        {selected === 'reaction_ms' && <p className="assessment-muted">Previous five-trial protocol. <Link to="/assessments">Open the new reaction sessions</Link>; the two protocols are not combined.</p>}
        <IndicatorChart data={data} threshold={thresholds?.[selected]} unit={indicator.unit} />
        {selected === 'systolic_bp' && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: -8 }}>
              <span><span style={{ color: 'var(--chart-series-1)' }}>●</span> systolic</span>
              <span><span style={{ color: 'var(--chart-series-2)' }}>●</span> diastolic</span>
            </div>
            <IndicatorChart data={diastolic} threshold={thresholds?.diastolic_bp} unit="mmHg" color="var(--chart-series-2)" height={140} />
          </div>
        )}
      </Panel>
    </div>
  );
}

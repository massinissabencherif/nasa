import { t, dateLocale, MeasurementIcon } from '@hestia/ui';
import { newestReading, originLabel } from '../lib/latestReading';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Thresholds } from '@hestia/api-client';
import { Button, Panel } from '@hestia/ui';
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
    api
      .getThresholds()
      .then(setThresholds)
      .catch(() => {});
  }, [api]);

  const data = useMeasurements(crewId, selected, 30);
  const diastolic = useMeasurements(crewId, 'diastolic_bp', 30);
  const indicator = INDICATORS.find((i) => i.key === selected)!;
  const newest = newestReading(data);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{t('History')}</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {t(
            'Bands show the indicative green, orange and red ranges. Each series says where its newest value comes from.',
          )}
        </p>
      </div>

      <div
        className="hz-indicator-picker"
        role="group"
        aria-label={t('Choose a measurement', 'Choisir une mesure')}
      >
        {INDICATORS.map((ind) => (
          <Button
            key={ind.key}
            className="hz-choice"
            active={selected === ind.key}
            onClick={() => setSelected(ind.key)}
            aria-pressed={selected === ind.key}
          >
            <MeasurementIcon name={ind.key} size={18} aria-hidden="true" />
            {t(ind.label)}
          </Button>
        ))}
      </div>

      <Panel title={`${t(indicator.label)} · ${t('last 30 days', '30 derniers jours')}`}>
        {selected === 'reaction_ms' && (
          <p className="assessment-muted">
            {t('Previous five-trial protocol.')}{' '}
            <Link to="/assessments">{t('Open the new reaction sessions')}</Link>
            {t('; the two protocols are not combined.')}
          </p>
        )}
        <IndicatorChart data={data} threshold={thresholds?.[selected]} unit={indicator.unit} />
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
          {newest ? (
            <>
              {t('Newest:')}{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                {newest.value} {indicator.unit}
              </span>{' '}
              ·{' '}
              {new Date(newest.ts.endsWith('Z') ? newest.ts : `${newest.ts}Z`).toLocaleString(dateLocale(), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {t(originLabel(newest.source))}
            </>
          ) : (
            t('No reading in the last 30 days.', 'Aucune mesure au cours des 30 derniers jours.')
          )}
        </p>
        {selected === 'systolic_bp' && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: 'flex',
                gap: 14,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                marginBottom: -8,
              }}
            >
              <span>
                <span style={{ color: 'var(--chart-series-1)' }}>●</span>
                {t('systolic')}
              </span>
              <span>
                <span style={{ color: 'var(--chart-series-2)' }}>●</span>
                {t('diastolic')}
              </span>
            </div>
            <IndicatorChart
              data={diastolic}
              threshold={thresholds?.diastolic_bp}
              unit="mmHg"
              color="var(--chart-series-2)"
              height={140}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

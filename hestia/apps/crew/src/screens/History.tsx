import {
  t,
  dateLocale,
  MeasurementIcon,
  Button,
  DetailSheet,
  Panel,
  LoadingState,
  LoadError,
} from '@hestia/ui';
import { newestReading, originLabel } from '../lib/latestReading';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Measurement, Thresholds } from '@hestia/api-client';
import { IndicatorChart } from '../components/IndicatorChart';
import { useApi } from '../lib/ApiProvider';
import { useMeasurementState, useSelectedCrewId } from '../lib/hooks';
import './history.css';

const INDICATORS = [
  { key: 'systolic_bp', label: 'Blood pressure', unit: 'mmHg' },
  { key: 'heart_rate', label: 'Heart rate', unit: 'bpm' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'sleep_h', label: 'Sleep', unit: 'h' },
  { key: 'mood', label: 'Mood', unit: '1–5' },
  { key: 'reaction_ms', label: 'Legacy reaction', unit: 'ms' },
  { key: 'exercise_min', label: 'Exercise', unit: 'min' },
];

function LatestReading({ data, unit }: { data: Measurement[]; unit: string }) {
  const reading = newestReading(data);
  if (!reading) return null;
  return (
    <div className="history-latest">
      <p>
        <strong>{reading.value.toLocaleString(dateLocale(), { maximumFractionDigits: 2 })}</strong>{' '}
        <span>{unit}</span>
      </p>
      <small>
        {t('Latest reading', 'Dernière mesure')} ·{' '}
        {new Date(reading.ts.endsWith('Z') ? reading.ts : `${reading.ts}Z`).toLocaleString(dateLocale(), {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        · {t(originLabel(reading.source))}
      </small>
    </div>
  );
}

export function History() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const [selected, setSelected] = useState('systolic_bp');
  const [choosing, setChoosing] = useState(false);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  const [thresholdError, setThresholdError] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .getThresholds()
      .then((value) => {
        if (active) {
          setThresholds(value);
          setThresholdError(false);
        }
      })
      .catch(() => {
        if (active) setThresholdError(true);
      });
    return () => {
      active = false;
    };
  }, [api]);
  const series = useMeasurementState(crewId, selected, 30);
  const diastolic = useMeasurementState(crewId, 'diastolic_bp', 30);
  const indicator = INDICATORS.find((item) => item.key === selected)!;
  const pressure = selected === 'systolic_bp';
  const charts = pressure
    ? [
        {
          state: series,
          key: selected,
          label: t('Systolic pressure', 'Tension systolique'),
          color: 'var(--chart-series-1)',
        },
        {
          state: diastolic,
          key: 'diastolic_bp',
          label: t('Diastolic pressure', 'Tension diastolique'),
          color: 'var(--chart-series-2)',
        },
      ]
    : [{ state: series, key: selected, label: t(indicator.label), color: 'var(--chart-series-1)' }];
  return (
    <div className="history-page">
      <header>
        <h1>{t('History')}</h1>
        <p>{t('Your readings over the last 30 days.', 'Vos mesures des 30 derniers jours.')}</p>
      </header>
      <Button className="history-measure-choice" onClick={() => setChoosing(true)} aria-haspopup="dialog">
        <MeasurementIcon name={selected} size={22} aria-hidden="true" />
        <strong>{t(indicator.label)}</strong>
        <span>{t('Change', 'Changer')}</span>
      </Button>
      {selected === 'reaction_ms' && (
        <p className="history-note">
          {t('Earlier check-in readings, kept separately.', 'Anciennes mesures du bilan, conservées à part.')}{' '}
          <Link to="/assessments/history">
            {t('See reaction test results', 'Voir les résultats des tests de réaction')}
          </Link>
        </p>
      )}
      <Panel className="history-charts">
        {charts.map(({ state, key, label, color }) => (
          <section key={key} className="history-series" aria-label={label}>
            <h2>
              <span className="history-series-mark" style={{ background: color }} aria-hidden="true" />
              {label}
            </h2>
            {state.error ? (
              <LoadError
                label={t('Readings could not load.', 'Impossible de charger les mesures.')}
                onRetry={state.refresh}
              />
            ) : state.data == null ? (
              <LoadingState label={t('Loading readings…', 'Chargement des mesures…')} />
            ) : !state.data.length ? (
              <p className="history-empty">
                {t('No reading in the last 30 days.', 'Aucune mesure au cours des 30 derniers jours.')}
              </p>
            ) : (
              <>
                <LatestReading data={state.data} unit={indicator.unit} />
                <IndicatorChart
                  data={state.data}
                  threshold={thresholds?.[key]}
                  unit={indicator.unit}
                  color={color}
                  height={pressure ? 130 : 190}
                />
              </>
            )}
          </section>
        ))}
        {thresholdError ? (
          <p className="history-note">
            {t(
              'Reference ranges unavailable. Curves show readings only.',
              'Repères indisponibles. Les courbes affichent uniquement les mesures.',
            )}
          </p>
        ) : (
          thresholds &&
          charts.some(({ key }) => thresholds[key]) && (
            <p className="history-note">
              {t(
                'Background bands: indicative demo ranges. These curves do not provide a diagnosis.',
                'Bandes de fond : repères indicatifs de démo. Ces courbes ne constituent pas un diagnostic.',
              )}
            </p>
          )
        )}
      </Panel>
      {choosing && (
        <DetailSheet
          title={t('Choose a measurement', 'Choisir une mesure')}
          onClose={() => setChoosing(false)}
        >
          <div className="history-picker">
            {INDICATORS.map((item) => (
              <Button
                key={item.key}
                active={selected === item.key}
                aria-pressed={selected === item.key}
                onClick={() => {
                  setSelected(item.key);
                  setChoosing(false);
                }}
              >
                <MeasurementIcon name={item.key} size={20} aria-hidden="true" />
                {t(item.label)}
              </Button>
            ))}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}

import { t } from '@hestia/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckinResult } from '@hestia/api-client';
import {
  AdviceText,
  Button,
  Panel,
  IconCaution,
  IconCheck,
  IconCritical,
  HelpButton,
  indicatorLabel,
  ZONE_META,
  ZONES,
} from '@hestia/ui';
import { ExplainSheet, FieldRow } from '../components/FieldRow';
import { ReactionTest } from '../components/ReactionTest';
import { Stepper } from '../components/Stepper';
import {
  answerCount,
  buildCheckinBody,
  emptyMeasureCount,
  reviewRows,
  type StepKey,
} from '../lib/checkinFlow';
import { EXPLANATIONS, SYMPTOM_OPTIONS } from '../lib/explanations';
import { useApi } from '../lib/ApiProvider';
import { useLatestMeasurements, useSelectedCrewId } from '../lib/hooks';

type FormState = Record<string, number | ''>;
const KEYS_OF = (fields: { key: string }[]) => fields.map((field) => field.key);

const FIELDS: { key: string; step?: number }[] = [
  { key: 'systolic_bp' },
  { key: 'diastolic_bp' },
  { key: 'heart_rate' },
  { key: 'glucose' },
  { key: 'temperature', step: 0.1 },
  { key: 'weight', step: 0.1 },
  { key: 'sleep_h', step: 0.5 },
  { key: 'exercise_min', step: 5 },
];

const MOODS = ['Very low', 'Low', 'OK', 'Good', 'Great'];
const MEASURE_KEYS = KEYS_OF(FIELDS);
const MEASURE_META = Object.fromEntries(
  Object.entries(EXPLANATIONS).map(([key, info]) => [key, { label: info.label, unit: info.unit }]),
);

function Result({ result, onDone }: { result: CheckinResult; onDone: () => void }) {
  const attention = ZONES.filter(
    (z) => result.status[z].level === 'orange' || result.status[z].level === 'red',
  );
  const noData = ZONES.filter((z) => result.status[z].level === 'unknown');
  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
        <IconCheck size={22} />
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)' }}>
          {t('Check-in saved')}
        </h1>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        {attention.length > 0
          ? `Zones needing attention: ${attention.map((z) => ZONE_META[z].label).join(', ')}.`
          : noData.length === 0
            ? 'Every body zone is nominal. Nothing to do.'
            : 'Every measured zone is nominal.'}
        {noData.length > 0 && ` No recent data for: ${noData.map((z) => ZONE_META[z].label).join(', ')}.`}
      </p>
      {result.alerts.map((alert) => {
        const red = alert.level === 'red';
        return (
          <div
            key={alert.id}
            role={red ? 'alert' : undefined}
            style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: red ? 'var(--red-dim)' : 'var(--orange-dim)',
              border: `1px solid ${red ? 'var(--red)' : 'var(--orange)'}`,
              display: 'grid',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: red ? 'var(--red)' : 'var(--orange)',
              }}
            >
              {red ? <IconCritical size={18} /> : <IconCaution size={18} />}
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                {red ? 'Red alert' : 'Advice'}: {indicatorLabel(alert.indicator)}
              </span>
            </div>
            <AdviceText message={alert.message} />
          </div>
        );
      })}
      <Button variant="primary" size="lg" onClick={onDone}>
        {t('See my body status')}
      </Button>
    </div>
  );
}

export function Checkin() {
  const navigate = useNavigate();
  const api = useApi();
  const crewId = useSelectedCrewId();
  const latest = useLatestMeasurements(crewId);
  const [step, setStep] = useState<StepKey>('feel');
  const [form, setForm] = useState<FormState>({});
  const [mood, setMood] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // a new step starts at the stepper and moves focus to its title, so keyboard
  // and screen-reader users land at the start of the step
  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start' });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const draft = { values: form, mood, symptoms: [...symptoms] };
  const answers = answerCount(draft, MEASURE_KEYS);

  async function save() {
    if (crewId == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      setResult(await api.checkin(crewId, buildCheckinBody(draft, MEASURE_KEYS)));
    } catch (err) {
      // the draft stays as it is: the person can retry without typing again
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (result) return <Result result={result} onDone={() => navigate('/home')} />;
  if (testing && crewId != null) {
    return (
      <ReactionTest crewId={crewId} onCancel={() => setTesting(false)} backLabel={t('Back to my check-in')} />
    );
  }

  const card = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--panel)',
    overflow: 'hidden',
  } as const;
  const infoButton = (key: 'mood' | 'symptoms' | 'reaction_ms', _label: string) => (
    <HelpButton label={t(EXPLANATIONS[key].label)}>
      <ExplainSheet field={key} />
    </HelpButton>
  );
  const titles: Record<StepKey, string> = {
    feel: 'How do you feel?',
    measure: 'Your measurements',
    review: 'Review your check-in',
  };

  return (
    <div key={step} className="hz-step" style={{ padding: 16, display: 'grid', gap: 12, paddingBottom: 24 }}>
      <div ref={top} style={{ display: 'grid', gap: 'var(--space-3)', scrollMarginTop: 'var(--space-4)' }}>
        <Stepper current={step} />
        <h1
          ref={heading}
          tabIndex={-1}
          style={{ fontSize: 'var(--text-xl)', fontWeight: 700, outline: 'none' }}
        >
          {t(titles[step])}
        </h1>
      </div>

      {step === 'feel' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {t('Two quick questions. You can leave any question unanswered.')}
          </p>
          <Panel title={t(EXPLANATIONS.mood.label)} action={infoButton('mood', 'How, why and risk: mood')}>
            <div className="hz-mood-options" role="group" aria-label={t(EXPLANATIONS.mood.label)}>
              {MOODS.map((label, i) => {
                const selected = mood === i + 1;
                return (
                  <Button
                    key={label}
                    className="hz-choice hz-mood-choice"
                    active={selected}
                    aria-pressed={selected}
                    onClick={() => setMood(selected ? null : i + 1)}
                  >
                    <strong>{i + 1}</strong>
                    <span>{t(label)}</span>
                  </Button>
                );
              })}
            </div>
          </Panel>

          <Panel
            title={t(EXPLANATIONS.symptoms.label)}
            action={infoButton('symptoms', 'How, why and risk: symptoms')}
          >
            <div className="hz-choice-list" role="group" aria-label={t(EXPLANATIONS.symptoms.label)}>
              {SYMPTOM_OPTIONS.map((s) => (
                <Button
                  key={s}
                  className="hz-choice"
                  active={symptoms.has(s)}
                  aria-pressed={symptoms.has(s)}
                  onClick={() => toggleSymptom(s)}
                >
                  {t(s)}
                </Button>
              ))}
            </div>
            <p className="assessment-muted">{t('Select anything you are noticing.')}</p>
          </Panel>

          <Button variant="primary" size="lg" onClick={() => setStep('measure')}>
            {t('Continue to measurements')}
          </Button>
          <Button onClick={() => navigate('/home')}>{t('Back to home')}</Button>
        </>
      )}

      {step === 'measure' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {t(
              'Enter what you measured today and leave the rest empty. The (i) button explains how, why and the risk.',
            )}
          </p>

          {FIELDS.map(({ key, step: increment }) => (
            <FieldRow
              key={key}
              field={key}
              step={increment}
              value={form[key] ?? ''}
              last={latest?.[key]?.value}
              lastTs={latest?.[key]?.ts}
              onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
            />
          ))}

          <div className="hz-checkin-callout">
            <Button onClick={() => setTesting(true)}>{t('Open reaction test')}</Button>
            <p>
              {t(
                'Optional. Your check-in answers are kept.',
                'Facultatif. Vos réponses au bilan sont conservées.',
              )}
            </p>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {t('Nothing is saved until you confirm on the next step.')}
          </p>
          {/* stays in view: the list is long and the next step is the main action */}
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              display: 'grid',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) 0',
              background: 'var(--bg)',
            }}
          >
            <Button variant="primary" size="lg" onClick={() => setStep('review')}>
              {t('Review my check-in')}
            </Button>
            <Button onClick={() => setStep('feel')}>{t('Back to how I feel')}</Button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {t('Check what will be recorded for you. Nothing is saved until you confirm.')}
          </p>
          <div style={{ ...card, display: 'grid' }}>
            {reviewRows(draft, MEASURE_KEYS, MEASURE_META, MOODS).map((row, i) => (
              <div
                key={row.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{t(row.label)}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    color:
                      row.value === 'Not answered' || row.value === 'None selected'
                        ? 'var(--text-faint)'
                        : 'var(--text)',
                  }}
                >
                  {t(row.value)}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {emptyMeasureCount(draft, MEASURE_KEYS)} {t('measurement')}{' '}
            {emptyMeasureCount(draft, MEASURE_KEYS) === 1 ? '' : 's'}{' '}
            {t('left empty: they stay unknown, not normal.')}
          </p>

          {error && (
            <p role="alert" style={{ color: 'var(--red-ink)', fontSize: 'var(--text-sm)' }}>
              {t('Not saved:')} {error}
              {t('. Your answers are kept: try again.')}
            </p>
          )}
          <Button variant="primary" size="lg" loading={saving} disabled={answers === 0} onClick={save}>
            {answers === 0
              ? t('Answer at least one question')
              : saving
                ? t('Saving')
                : t(`Save check-in (${answers} answers)`, `Enregistrer le bilan (${answers} réponses)`)}
          </Button>
          <Button onClick={() => setStep('measure')}>{t('Back to measurements')}</Button>
          <Button variant="ghost" onClick={() => setStep('feel')}>
            {t('Edit how I feel')}
          </Button>
        </>
      )}
    </div>
  );
}

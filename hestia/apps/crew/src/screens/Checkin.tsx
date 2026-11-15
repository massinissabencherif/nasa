import { t } from '@hestia/ui';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckinResult } from '@hestia/api-client';
import { Button, MeasurementIcon, IconSymptoms, IconMood, IconReaction, HelpButton } from '@hestia/ui';
import { ExplainSheet, FieldRow } from '../components/FieldRow';
import { ReactionTest } from '../components/ReactionTest';
import { Stepper } from '../components/Stepper';
import { CheckinResult as Result } from '../components/CheckinResult';
import './checkin.css';
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

  const titles: Record<StepKey, string> = {
    feel: 'How do you feel?',
    measure: 'Your measurements',
    review: 'Review your check-in',
  };

  return (
    <div key={step} className="hz-step checkin-page">
      <div ref={top} style={{ display: 'grid', gap: 'var(--space-3)', scrollMarginTop: 'var(--space-4)' }}>
        <Stepper current={step} />
        <h1 ref={heading} tabIndex={-1} className="checkin-title">
          {t(titles[step])}
        </h1>
      </div>

      {step === 'feel' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {t('Two quick questions. You can leave any question unanswered.')}
          </p>
          <section className="checkin-question">
            <header>
              <IconMood size={20} aria-hidden="true" />
              <h2>{t('Your mood today', 'Votre moral aujourd’hui')}</h2>
              <HelpButton label={t(EXPLANATIONS.mood.label)}>
                <ExplainSheet field="mood" />
              </HelpButton>
            </header>
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
          </section>

          <section className="checkin-question">
            <header>
              <IconSymptoms size={20} aria-hidden="true" />
              <h2>{t('What are you noticing?', 'Que ressentez-vous ?')}</h2>
              <HelpButton label={t(EXPLANATIONS.symptoms.label)}>
                <ExplainSheet field="symptoms" />
              </HelpButton>
            </header>
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
            <p className="checkin-note">{t('Select anything you are noticing.')}</p>
          </section>

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

          {[
            { title: t('Heart & blood pressure', 'Cœur et tension'), fields: FIELDS.slice(0, 3) },
            { title: t('Other measurements', 'Autres mesures'), fields: FIELDS.slice(3, 6) },
            { title: t('Sleep & exercise', 'Sommeil et activité'), fields: FIELDS.slice(6) },
          ].map((group) => (
            <section key={group.fields[0].key} className="checkin-measures">
              <h2>{group.title}</h2>
              <div className="checkin-measures-grid">
                {group.fields.map(({ key, step: increment }) => (
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
              </div>
            </section>
          ))}

          <div className="hz-checkin-callout">
            <Button icon={<IconReaction size={18} />} onClick={() => setTesting(true)}>
              {t('Open reaction test')}
            </Button>
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
          <div className="checkin-actions">
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
          <dl className="checkin-review">
            {reviewRows(draft, MEASURE_KEYS, MEASURE_META, MOODS).map((row) => (
              <div key={row.key}>
                <dt>
                  <MeasurementIcon name={row.key} size={18} aria-hidden="true" />
                  {t(row.label)}
                </dt>
                <dd data-empty={row.value === 'Not answered' || row.value === 'None selected' || undefined}>
                  {row.key === 'mood' && mood != null
                    ? `${mood}/5 · ${t(MOODS[mood - 1])}`
                    : row.key === 'symptoms' && symptoms.size
                      ? [...symptoms].map((symptom) => t(symptom)).join(', ')
                      : t(row.value)}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {t(
              `${emptyMeasureCount(draft, MEASURE_KEYS)} measurements left empty: they stay unknown, not normal.`,
              `${emptyMeasureCount(draft, MEASURE_KEYS)} mesures non renseignées : elles restent inconnues, pas normales.`,
            )}
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

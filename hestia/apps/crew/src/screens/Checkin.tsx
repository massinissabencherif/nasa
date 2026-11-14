import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckinResult } from '@hestia/api-client';
import { AdviceText, Button, IconCaution, IconCheck, IconCritical, IconInfo, indicatorLabel, ZONE_META, ZONES } from '@hestia/ui';
import { ExplainSheet, FieldRow } from '../components/FieldRow';
import { ReactionTest } from '../components/ReactionTest';
import { Stepper } from '../components/Stepper';
import { answerCount, buildCheckinBody, emptyMeasureCount, reviewRows, type StepKey } from '../lib/checkinFlow';
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
const MEASURE_META = Object.fromEntries(Object.entries(EXPLANATIONS).map(([key, info]) => [key, { label: info.label, unit: info.unit }]));

function Result({ result, onDone }: { result: CheckinResult; onDone: () => void }) {
  const attention = ZONES.filter((z) => result.status[z].level === 'orange' || result.status[z].level === 'red');
  const noData = ZONES.filter((z) => result.status[z].level === 'unknown');
  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
        <IconCheck size={22} />
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text)' }}>Check-in saved</h1>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: red ? 'var(--red)' : 'var(--orange)' }}>
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
        See my body status
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
  const [openSheet, setOpenSheet] = useState<'mood' | 'symptoms' | 'reaction_ms' | null>(null);
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
    return <ReactionTest crewId={crewId} onCancel={() => setTesting(false)} backLabel="Back to my check-in" />;
  }

  const card = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--panel)', overflow: 'hidden' } as const;
  const infoButton = (key: 'mood' | 'symptoms' | 'reaction_ms', label: string) => (
    <button
      onClick={() => setOpenSheet((s) => (s === key ? null : key))}
      aria-label={label}
      aria-expanded={openSheet === key}
      style={{ background: 'none', border: 'none', color: openSheet === key ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44 }}
    >
      <IconInfo size={20} />
    </button>
  );
  const titles: Record<StepKey, string> = { feel: 'How do you feel?', measure: 'Your measurements', review: 'Review your check-in' };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12, paddingBottom: 24 }}>
      <div ref={top} style={{ display: 'grid', gap: 'var(--space-3)', scrollMarginTop: 'var(--space-4)' }}>
        <Stepper current={step} />
        <h1 ref={heading} tabIndex={-1} style={{ fontSize: 'var(--text-xl)', fontWeight: 700, outline: 'none' }}>
          {titles[step]}
        </h1>
      </div>

      {step === 'feel' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Two quick questions. You can leave any question unanswered.
          </p>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 0 14px' }}>
              <p style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.mood.label}</p>
              {infoButton('mood', 'How, why and risk: mood')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: '4px 14px 14px' }}>
              {MOODS.map((label, i) => {
                const selected = mood === i + 1;
                return (
                  <button
                    key={label}
                    onClick={() => setMood(selected ? null : i + 1)}
                    aria-pressed={selected}
                    style={{
                      padding: 'var(--space-3) 2px',
                      minHeight: 56,
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent-dim)' : 'var(--panel-raised)',
                      color: selected ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>{i + 1}</span>
                    <span style={{ fontSize: 'var(--text-xs)' }}>{label}</span>
                  </button>
                );
              })}
            </div>
            {openSheet === 'mood' && <ExplainSheet field="mood" />}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 0 14px' }}>
              <p style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.symptoms.label}</p>
              {infoButton('symptoms', 'How, why and risk: symptoms')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 14px 14px' }}>
              {SYMPTOM_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  aria-pressed={symptoms.has(s)}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    minHeight: 44,
                    borderRadius: 999,
                    border: `1px solid ${symptoms.has(s) ? 'var(--accent)' : 'var(--border)'}`,
                    background: symptoms.has(s) ? 'var(--accent-dim)' : 'var(--panel-raised)',
                    color: symptoms.has(s) ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', padding: '0 14px 12px' }}>Select anything you are noticing.</p>
            {openSheet === 'symptoms' && <ExplainSheet field="symptoms" />}
          </div>

          <Button variant="primary" size="lg" onClick={() => setStep('measure')}>
            Continue to measurements
          </Button>
          <Button onClick={() => navigate('/home')}>Back to home</Button>
        </>
      )}

      {step === 'measure' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Enter what you measured today and leave the rest empty. The (i) button explains how, why and the risk.
          </p>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 10px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.reaction_ms.label} (optional)</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  3 practice + 15 measured trials · saved separately · your answers stay here
                </p>
              </div>
              <Button onClick={() => setTesting(true)}>Start</Button>
              {infoButton('reaction_ms', 'How, why and risk: reaction test')}
            </div>
            {openSheet === 'reaction_ms' && <ExplainSheet field="reaction_ms" />}
          </div>

          {FIELDS.map(({ key, step: increment }) => (
            <FieldRow key={key} field={key} step={increment} value={form[key] ?? ''} last={latest?.[key]?.value} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
          ))}

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>Nothing is saved until you confirm on the next step.</p>
          {/* stays in view: the list is long and the next step is the main action */}
          <div style={{ position: 'sticky', bottom: 0, display: 'grid', gap: 'var(--space-2)', padding: 'var(--space-3) 0', background: 'var(--bg)' }}>
            <Button variant="primary" size="lg" onClick={() => setStep('review')}>
              Review my check-in
            </Button>
            <Button onClick={() => setStep('feel')}>Back to how I feel</Button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Check what will be recorded for you. Nothing is saved until you confirm.
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
                <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    color: row.value === 'Not answered' || row.value === 'None selected' ? 'var(--text-faint)' : 'var(--text)',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {emptyMeasureCount(draft, MEASURE_KEYS)} measurement{emptyMeasureCount(draft, MEASURE_KEYS) === 1 ? '' : 's'} left empty: they stay unknown, not normal.
          </p>

          {error && (
            <p role="alert" style={{ color: 'var(--red-ink)', fontSize: 'var(--text-sm)' }}>
              Not saved: {error}. Your answers are kept: try again.
            </p>
          )}
          <Button variant="primary" size="lg" loading={saving} disabled={answers === 0} onClick={save}>
            {answers === 0 ? 'Answer at least one question' : saving ? 'Saving' : `Save check-in (${answers} answer${answers > 1 ? 's' : ''})`}
          </Button>
          <Button onClick={() => setStep('measure')}>Back to measurements</Button>
          <Button variant="ghost" onClick={() => setStep('feel')}>Edit how I feel</Button>
        </>
      )}
    </div>
  );
}

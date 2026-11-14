import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckinResult } from '@hestia/api-client';
import { Button, IconCaution, IconCheck, IconCritical, IconInfo, indicatorLabel, ZONE_META, ZONES } from '@hestia/ui';
import { ExplainSheet, FieldRow } from '../components/FieldRow';
import { EXPLANATIONS, SYMPTOM_OPTIONS } from '../lib/explanations';
import { useApi } from '../lib/ApiProvider';
import { useLatestMeasurements, useSelectedCrewId } from '../lib/hooks';

type FormState = Record<string, number | ''>;

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
            <p style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-line' }}>{alert.message}</p>
            {alert.sent_to_earth && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>The crew is alerted and a report is on its way to Earth.</p>}
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
  const [form, setForm] = useState<FormState>({});
  const [mood, setMood] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [openSheet, setOpenSheet] = useState<'mood' | 'symptoms' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const filled = FIELDS.filter(({ key }) => form[key] !== '' && form[key] !== undefined).length + (mood != null ? 1 : 0) + symptoms.size;

  async function save() {
    if (crewId == null) return;
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = { symptoms: [...symptoms] };
    for (const { key } of FIELDS) {
      if (form[key] !== '' && form[key] !== undefined) body[key] = form[key];
    }
    if (mood != null) body.mood = mood;
    try {
      setResult(await api.checkin(crewId, body));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (result) return <Result result={result} onDone={() => navigate('/home')} />;

  const card = { border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--panel)', overflow: 'hidden' } as const;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10, paddingBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Daily check-in</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Fill in what you measured today; leave the rest empty. The (i) button explains how, why and the risk.
        </p>
      </div>

      {FIELDS.map(({ key, step }) => (
        <FieldRow key={key} field={key} step={step} value={form[key] ?? ''} last={latest?.[key]?.value} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
      ))}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 0 14px' }}>
          <p style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.mood.label}</p>
          <button
            onClick={() => setOpenSheet((s) => (s === 'mood' ? null : 'mood'))}
            aria-label="How, why and risk: mood"
            style={{ background: 'none', border: 'none', color: openSheet === 'mood' ? 'var(--accent)' : 'var(--text-faint)', cursor: 'pointer', padding: 10 }}
          >
            <IconInfo size={20} />
          </button>
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
                  padding: '10px 2px',
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
                <span style={{ fontSize: 10 }}>{label}</span>
              </button>
            );
          })}
        </div>
        {openSheet === 'mood' && <ExplainSheet field="mood" />}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px 0 14px' }}>
          <p style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.symptoms.label}</p>
          <button
            onClick={() => setOpenSheet((s) => (s === 'symptoms' ? null : 'symptoms'))}
            aria-label="How, why and risk: symptoms"
            style={{ background: 'none', border: 'none', color: openSheet === 'symptoms' ? 'var(--accent)' : 'var(--text-faint)', cursor: 'pointer', padding: 10 }}
          >
            <IconInfo size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 14px 14px' }}>
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              aria-pressed={symptoms.has(s)}
              style={{
                padding: '9px 14px',
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
        {openSheet === 'symptoms' && <ExplainSheet field="symptoms" />}
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>
          Not saved: {error}
        </p>
      )}
      <Button variant="primary" size="lg" onClick={save} disabled={saving || filled === 0} style={{ marginTop: 6 }}>
        {saving ? 'Saving…' : filled === 0 ? 'Fill in at least one field' : `Save check-in (${filled} value${filled > 1 ? 's' : ''})`}
      </Button>
    </div>
  );
}

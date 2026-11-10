import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconInfo } from '@hestia/ui';
import { FieldRow } from '../components/FieldRow';
import { EXPLANATIONS, SYMPTOM_OPTIONS } from '../lib/explanations';
import { useApi } from '../lib/ApiProvider';
import { useSelectedCrewId } from '../lib/hooks';

type FormState = Record<string, number | ''>;

const FIELDS: { key: string; step?: number }[] = [
  { key: 'systolic_bp' },
  { key: 'diastolic_bp' },
  { key: 'heart_rate' },
  { key: 'glucose' },
  { key: 'temperature', step: 0.1 },
  { key: 'weight', step: 0.1 },
  { key: 'sleep_h', step: 0.5 },
  { key: 'mood' },
  { key: 'exercise_min' },
];

export function Checkin() {
  const navigate = useNavigate();
  const api = useApi();
  const crewId = useSelectedCrewId();
  const [form, setForm] = useState<FormState>({});
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function save() {
    if (crewId == null) return;
    setSaving(true);
    const body: Record<string, unknown> = { symptoms: [...symptoms] };
    for (const { key } of FIELDS) {
      if (form[key] !== '' && form[key] !== undefined) body[key] = form[key];
    }
    await api.checkin(crewId, body);
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate('/home'), 900);
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10, paddingBottom: 32 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 4 }}>Daily check-in</h1>
      {FIELDS.map(({ key, step }) => (
        <FieldRow
          key={key}
          field={key}
          step={step}
          value={form[key] ?? ''}
          onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
        />
      ))}

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--panel)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <p style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>{EXPLANATIONS.symptoms.label}</p>
          <button
            onClick={() => setSymptomsOpen((o) => !o)}
            aria-label="Why we ask: symptoms"
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
          >
            <IconInfo size={18} />
          </button>
        </div>
        {symptomsOpen && (
          <div style={{ padding: '0 14px 10px', display: 'grid', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <p><strong style={{ color: 'var(--text)' }}>How: </strong>{EXPLANATIONS.symptoms.how}</p>
            <p><strong style={{ color: 'var(--text)' }}>Why: </strong>{EXPLANATIONS.symptoms.why}</p>
            <p><strong style={{ color: 'var(--text)' }}>Risk: </strong>{EXPLANATIONS.symptoms.risk}</p>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 14px 14px' }}>
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              style={{
                padding: '8px 14px',
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
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          marginTop: 8,
          padding: 16,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: saved ? 'var(--green)' : 'var(--accent)',
          color: '#07222c',
          fontWeight: 700,
          fontSize: 'var(--text-base)',
          cursor: 'pointer',
        }}
      >
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save check-in'}
      </button>
    </div>
  );
}

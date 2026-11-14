import { useState } from 'react';
import { IconInfo } from '@hestia/ui';
import { EXPLANATIONS } from '../lib/explanations';

export function ExplainSheet({ field }: { field: string }) {
  const info = EXPLANATIONS[field];
  return (
    <div style={{ padding: '0 14px 14px', display: 'grid', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
      <p>
        <strong style={{ color: 'var(--text)' }}>How: </strong>
        {info.how}
      </p>
      <p>
        <strong style={{ color: 'var(--text)' }}>Why: </strong>
        {info.why}
      </p>
      <p>
        <strong style={{ color: 'var(--text)' }}>Risk: </strong>
        {info.risk}
      </p>
    </div>
  );
}

export function FieldRow({
  field,
  value,
  onChange,
  step = 1,
  last,
}: {
  field: string;
  value: number | '';
  onChange: (v: number | '') => void;
  step?: number;
  /** last recorded value, shown as a hint */
  last?: number;
}) {
  const [open, setOpen] = useState(false);
  const info = EXPLANATIONS[field];
  const inputId = `field-${field}`;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--panel)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 10px 14px' }}>
        <label htmlFor={inputId} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500 }}>{info.label}</span>
          {last != null && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>last: {last} {info.unit}</span>}
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={last != null ? String(last) : ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{
            width: 84,
            background: 'var(--panel-raised)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px',
            fontSize: 16,
            textAlign: 'right',
            fontFamily: 'var(--font-mono)',
          }}
        />
        <span style={{ width: 40, fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{info.unit}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={`How, why and risk: ${info.label}`}
          aria-expanded={open}
          style={{ background: 'none', border: 'none', color: open ? 'var(--accent)' : 'var(--text-faint)', cursor: 'pointer', padding: 10 }}
        >
          <IconInfo size={20} />
        </button>
      </div>
      {open && <ExplainSheet field={field} />}
    </div>
  );
}

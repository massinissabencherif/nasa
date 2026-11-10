import { useState } from 'react';
import { IconInfo } from '@hestia/ui';
import { EXPLANATIONS } from '../lib/explanations';

export function FieldRow({
  field,
  value,
  onChange,
  step = 1,
}: {
  field: string;
  value: number | '';
  onChange: (v: number | '') => void;
  step?: number;
}) {
  const [open, setOpen] = useState(false);
  const info = EXPLANATIONS[field];

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{info.label}</p>
        </div>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{
            width: 76,
            background: 'var(--panel-raised)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            fontSize: 'var(--text-base)',
            textAlign: 'right',
            fontFamily: 'var(--font-mono)',
          }}
        />
        <span style={{ width: 42, fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{info.unit}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={`Why we ask: ${info.label}`}
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
        >
          <IconInfo size={18} />
        </button>
      </div>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <p><strong style={{ color: 'var(--text)' }}>How: </strong>{info.how}</p>
          <p><strong style={{ color: 'var(--text)' }}>Why: </strong>{info.why}</p>
          <p><strong style={{ color: 'var(--text)' }}>Risk: </strong>{info.risk}</p>
        </div>
      )}
    </div>
  );
}

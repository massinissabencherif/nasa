import { STEPS, type StepKey } from '../lib/checkinFlow';

/** The three steps of the check-in. The current one is announced with
 * aria-current="step"; a finished one also says so in words. */
export function Stepper({ current }: { current: StepKey }) {
  const index = STEPS.findIndex((step) => step.key === current);
  return (
    <ol
      aria-label="Check-in steps"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}
    >
      {STEPS.map((step, i) => {
        const active = i === index;
        const done = i < index;
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            style={{ display: 'grid', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: active ? 'var(--text)' : 'var(--text-muted)' }}
          >
            <span
              aria-hidden="true"
              style={{ height: 3, borderRadius: 2, background: active || done ? 'var(--accent)' : 'var(--border)' }}
            />
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', fontWeight: active ? 600 : 500 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: active ? 'var(--accent)' : 'var(--text-faint)' }}>{i + 1}</span>
              {step.label}
              {done && <span className="sr-only">, done</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

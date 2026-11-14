import { parseAdvice } from '../adviceText';

/** An advice message with a hierarchy: the finding first and largest, the
 * steps as a numbered list, notes below, the disclaimer last and quiet. */
export function AdviceText({ message }: { message: string }) {
  const { finding, steps, notes, disclaimer } = parseAdvice(message);
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      {finding && <p style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text)' }}>{finding}</p>}
      {steps.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-1)' }}>
          {steps.map((step, index) => (
            <li key={step} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', flexShrink: 0 }}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
      {notes.map((note) => (
        <p key={note} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {note}
        </p>
      ))}
      {disclaimer && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{disclaimer}</p>}
    </div>
  );
}

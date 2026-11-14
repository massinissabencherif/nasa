import type { CSSProperties, ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  style,
  bodyStyle,
  elevated = false,
}: {
  title?: string;
  action?: ReactNode;
  /** the detail the person just opened: lifted above the work area */
  elevated?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        boxShadow: 'var(--shadow-panel)',
        ...(elevated ? { background: 'var(--panel-raised)', borderColor: 'var(--text-faint)', boxShadow: 'var(--shadow-detail)' } : {}),
        ...style,
      }}
    >
      {title && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)' }}>
            {title}
          </h2>
          {action}
        </header>
      )}
      <div style={{ padding: 16, flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
    </section>
  );
}

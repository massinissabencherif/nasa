import type { CSSProperties, ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  style,
  bodyStyle,
}: {
  title?: string;
  action?: ReactNode;
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
        ...style,
      }}
    >
      {title && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 16px',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
            {title}
          </h2>
          {action}
        </header>
      )}
      <div style={{ padding: 16, flex: 1, minHeight: 0, ...bodyStyle }}>{children}</div>
    </section>
  );
}

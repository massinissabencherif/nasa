import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_STYLE: Record<Variant, { background: string; color: string; border: string }> = {
  primary: { background: 'var(--accent)', color: '#07222c', border: '1px solid var(--accent)' },
  secondary: { background: 'var(--panel-raised)', color: 'var(--text)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
  danger: { background: 'var(--red-dim)', color: 'var(--text)', border: '1px solid var(--red)' },
};

const SIZE_STYLE = {
  sm: { padding: 'var(--space-1) var(--space-3)', minHeight: 28, radius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' },
  md: { padding: 'var(--space-2) var(--space-4)', minHeight: 36, radius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' },
  lg: { padding: 'var(--space-3) var(--space-5)', minHeight: 48, radius: 'var(--radius-md)', fontSize: 'var(--text-base)' },
} as const;

/**
 * One button for both apps. Hover, pressed, focus and loading are defined
 * once (see `.hz-btn` in tokens.css). While `loading`, the label stays and a
 * small ring is added; the button is announced as busy and ignores clicks.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  loading = false,
  icon,
  children,
  style,
  disabled,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  const v = VARIANT_STYLE[variant];
  const s = SIZE_STYLE[size];
  return (
    <button
      className="hz-btn"
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: s.padding,
        minHeight: s.minHeight,
        borderRadius: s.radius,
        fontSize: s.fontSize,
        fontWeight: variant === 'primary' || active ? 600 : 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...v,
        ...(active ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' } : {}),
        ...style,
      }}
      {...rest}
    >
      {loading ? <span className="hz-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

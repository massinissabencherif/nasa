import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_STYLE: Record<Variant, { background: string; color: string; border: string }> = {
  primary: { background: 'var(--accent)', color: '#07222c', border: '1px solid var(--accent)' },
  secondary: { background: 'var(--panel-raised)', color: 'var(--text)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
  danger: { background: 'var(--red-dim)', color: 'var(--text)', border: '1px solid var(--red)' },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  icon,
  children,
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  icon?: ReactNode;
}) {
  const v = VARIANT_STYLE[variant];
  const padding = size === 'sm' ? '5px 10px' : size === 'lg' ? '14px 18px' : '8px 14px';
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding,
        borderRadius: size === 'lg' ? 'var(--radius-md)' : 'var(--radius-sm)',
        fontSize: size === 'lg' ? 'var(--text-base)' : 'var(--text-sm)',
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
      {icon}
      {children}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Shared visual states; busy buttons keep focus but cannot activate again. */
export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  loading = false,
  icon,
  children,
  className = '',
  type = 'button',
  disabled,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...rest}
      type={type}
      className={`hz-btn ${className}`}
      data-variant={variant}
      data-size={size}
      data-active={active || undefined}
      disabled={disabled}
      aria-disabled={loading || disabled || rest['aria-disabled']}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {loading ? <span className="hz-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

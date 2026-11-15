import { t } from '../i18n';
import type { CSSProperties, ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  style,
  bodyStyle,
  className = '',
  elevated = false,
}: {
  title?: string;
  action?: ReactNode;
  /** the detail the person just opened: lifted above the work area */
  elevated?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  className?: string;
}) {
  return (
    <section className={`hz-panel ${className}`} data-elevated={elevated || undefined} style={style}>
      {title && (
        <header className="hz-panel-header">
          <h2>{t(title)}</h2>
          {action}
        </header>
      )}
      <div className="hz-panel-body" style={bodyStyle}>
        {children}
      </div>
    </section>
  );
}

import { t } from '../i18n';
import { useId, useState, type ReactNode } from 'react';
import { IconInfo } from '../icons';
import { DetailSheet } from './DetailSheet';

/** The hint names the action; the complete help also works by touch. */
export function HelpButton({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const hintId = useId();
  return (
    <>
      <span className="hz-help" onMouseEnter={() => setHint(true)} onMouseLeave={() => setHint(false)}>
        <button
          type="button"
          className="hz-icon-button"
          aria-label={`${t('About')} ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={hint ? hintId : undefined}
          onFocus={() => setHint(true)}
          onBlur={() => setHint(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setHint(false);
              event.stopPropagation();
            }
          }}
          onClick={() => {
            setHint(false);
            setOpen(true);
          }}
        >
          {icon ?? <IconInfo size={20} />}
        </button>
        {hint && !open && (
          <span id={hintId} role="tooltip" className="hz-tooltip">
            {t('About')} {label}
          </span>
        )}
      </span>
      {open && (
        <DetailSheet title={label} onClose={() => setOpen(false)}>
          {children}
        </DetailSheet>
      )}
    </>
  );
}

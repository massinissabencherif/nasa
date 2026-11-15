import { t } from '../i18n';
import { Button } from './Button';

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="hz-loading" role="status" aria-live="polite">
      <span className="hz-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function LoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="hz-load-error" role="alert">
      <p>{label}</p>
      <Button size="sm" onClick={onRetry}>
        {t('Retry', 'Réessayer')}
      </Button>
    </div>
  );
}

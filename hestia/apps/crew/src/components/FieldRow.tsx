import { t } from '@hestia/ui';
import { HelpButton, MeasurementInput, MeasurementIcon, MonitorReadingGuide, dateLocale } from '@hestia/ui';
import { EXPLANATIONS } from '../lib/explanations';

export function ExplainSheet({ field }: { field: string }) {
  const info = EXPLANATIONS[field];
  return (
    <div className="assessment-stack">
      <MonitorReadingGuide field={field} />
      <section>
        <h3>{t('How to measure')}</h3>
        <p>{t(info.how)}</p>
      </section>
      <section>
        <h3>{t('Why it matters')}</h3>
        <p>{t(info.why)}</p>
      </section>
      <section>
        <h3>{t('What to watch for')}</h3>
        <p>{t(info.risk)}</p>
      </section>
      <p className="assessment-muted">{t('Indicative information, not a diagnosis.')}</p>
    </div>
  );
}

export function FieldRow({
  field,
  value,
  onChange,
  step = 1,
  last,
  lastTs,
}: {
  field: string;
  value: number | '';
  onChange: (v: number | '') => void;
  step?: number;
  last?: number;
  lastTs?: string;
}) {
  const info = EXPLANATIONS[field];
  const inputId = `field-${field}`;
  const historyId = `${inputId}-history`;
  const unitId = `${inputId}-unit`;
  return (
    <div className="hz-measure-field">
      <div className="hz-measure-heading">
        <MeasurementIcon name={field} size={20} />
        <label htmlFor={inputId}>{t(info.label)}</label>
        <HelpButton label={t(info.label)}>
          <ExplainSheet field={field} />
        </HelpButton>
      </div>
      <MeasurementInput
        id={inputId}
        unit={info.unit}
        step={step}
        value={value}
        placeholder={t('Not entered')}
        aria-describedby={`${unitId}${last != null ? ` ${historyId}` : ''}`}
        onChange={(event) => onChange(event.target.value === '' ? '' : event.target.valueAsNumber)}
      />
      <span id={unitId} className="sr-only">
        {t('Unit:')} {info.unit}
      </span>
      {last != null && (
        <p id={historyId} className="hz-field-history">
          {t('Previous:')} {last} {info.unit}
          {lastTs &&
            ` · ${new Date(lastTs).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
        </p>
      )}
    </div>
  );
}

import type { ThresholdConfig } from '@hestia/api-client';
import { t, useLocale } from '../i18n';
import { thresholdRows } from '../thresholdText';

/** Rows keep the server's order, including overlapping bands and its fallback. */
export function ThresholdGuide({ label, config }: { label: string; config: ThresholdConfig }) {
  const locale = useLocale();
  const rows = thresholdRows(config, locale);
  const colour = (level: string) =>
    t(level, ({ green: 'Vert', orange: 'Orange', red: 'Rouge' } as Record<string, string>)[level]);
  if (rows.length === 0) return null;
  return (
    <section className="hz-threshold-guide">
      <h4>{label}</h4>
      {config.unit && <p>{t(config.unit)}</p>}
      <dl>
        {rows.map((row, index) => (
          <div key={`${row.level}-${index}`}>
            <dt data-level={row.level}>{colour(row.level)}</dt>
            <dd>{row.condition}</dd>
          </div>
        ))}
      </dl>
      {config.default && (
        <p className="hz-threshold-fallback">
          {t('Other values:', 'Autres valeurs :')} {colour(config.default)}
        </p>
      )}
    </section>
  );
}

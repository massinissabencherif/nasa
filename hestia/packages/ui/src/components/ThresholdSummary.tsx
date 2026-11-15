import type { Thresholds } from '@hestia/api-client';
import { t } from '../i18n';
import { IconInfo } from '../icons';
import { formatCondition } from '../thresholdText';
import { INDICATOR_LABELS } from '../zones';

const UNIT_HELP: Record<string, [string, string]> = {
  mmHg: [
    'Millimetres of mercury: the unit used for blood pressure.',
    'Millimètres de mercure : l’unité utilisée pour la tension artérielle.',
  ],
  'bpm (rest)': ['Beats per minute, measured at rest.', 'Battements par minute, mesurés au repos.'],
  'mg/dL': [
    'Milligrams per decilitre. The demo glucose ranges assume a fasting reading.',
    'Milligrammes par décilitre. Les repères de glycémie de la démo supposent une mesure à jeun.',
  ],
  '1-5': ['Your reported mood on a scale from 1 to 5.', 'Votre moral déclaré sur une échelle de 1 à 5.'],
};

/** A reference is not a target or a diagnosis. Full rules retain their order below. */
export function ThresholdSummary({
  indicators,
  thresholds,
}: {
  indicators: string[];
  thresholds: Thresholds;
}) {
  const rows = indicators.flatMap((key) => {
    const config = thresholds[key];
    const normal = config?.rules?.filter((rule) => rule.level === 'green') ?? [];
    return normal.length ? [{ key, config, normal }] : [];
  });
  if (!rows.length) return null;
  return (
    <table className="hz-reference-table">
      <caption>
        {t('Demo references · not medically validated', 'Repères de démo · sans validation médicale')}
      </caption>
      <thead>
        <tr>
          <th scope="col">{t('Measurement', 'Mesure')}</th>
          <th scope="col">{t('“Normal” band', 'Plage « normale »')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, config, normal }) => (
          <tr key={key}>
            <th scope="row">{t(INDICATOR_LABELS[key] ?? key)}</th>
            <td>
              <div className="hz-reference-value">
                <span className="hz-reference-range">
                  {normal.map((rule) => formatCondition(rule.when)).join(t(' or ', ' ou '))}
                </span>
                {config.unit &&
                  (UNIT_HELP[config.unit] ? (
                    <details className="hz-unit-help">
                      <summary>
                        {config.unit === 'bpm (rest)' ? 'bpm' : config.unit}
                        <IconInfo size={14} aria-hidden="true" />
                      </summary>
                      <p>{t(...UNIT_HELP[config.unit])}</p>
                    </details>
                  ) : (
                    <small>{t(config.unit)}</small>
                  ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { t, useLocale } from '../i18n';
import { readingText } from '../readingText';
import type { CrewStatus, Thresholds } from '@hestia/api-client';
import {
  IconCheck,
  IconCaution,
  IconCritical,
  IconInfo,
  IconReaction,
  MeasurementIcon,
  ZoneIcon,
} from '../icons';
import {
  CONTEXT_ZONE_NOTES,
  INDICATOR_LABELS,
  ZONE_META,
  showsDetailedAnatomy,
  type ZoneKey,
} from '../zones';
import { ThresholdGuide } from './ThresholdGuide';
import { ThresholdSummary } from './ThresholdSummary';
import { formatAge } from '../time';
import { LEVEL_META, StatusBadge } from './StatusBadge';

const LEVEL_ICON = { green: IconCheck, orange: IconCaution, red: IconCritical };

export function ZoneDetailPanel({
  zone,
  status,
  thresholds,
  contextType,
  onClose,
  hideHeading = false,
}: {
  zone: ZoneKey;
  status: CrewStatus;
  thresholds: Thresholds | null;
  contextType?: string;
  onClose?: () => void;
  hideHeading?: boolean;
}) {
  const locale = useLocale();
  const meta = ZONE_META[zone];
  const zoneStatus = status[zone];
  const contextNote = contextType ? CONTEXT_ZONE_NOTES[contextType]?.[zone] : undefined;
  return (
    <div className="assessment-stack">
      <div className="hz-inline-actions" style={{ alignItems: 'center' }}>
        {!showsDetailedAnatomy(zone) && (
          <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--accent)' }}>
            <ZoneIcon zone={zone} size={22} />
          </span>
        )}
        {!hideHeading && <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{t(meta.label)}</h2>}
        <StatusBadge level={zoneStatus.level} />
        {onClose && (
          <button className="hz-icon-button" onClick={onClose} aria-label={t('Close')}>
            ×
          </button>
        )}
      </div>
      {zoneStatus.reason && (
        <p className="assessment-notice">
          {zoneStatus.reason === 'no_data'
            ? t(
                'No reading for this zone yet. Complete a check-in; missing data does not mean everything is fine.',
                'Aucune mesure pour cette zone. Complétez un bilan ; l’absence de données ne signifie pas que tout va bien.',
              )
            : t(
                `Last reading: ${formatAge(zoneStatus.last_ts)}, previously ${zoneStatus.last_level ? LEVEL_META[zoneStatus.last_level].word : 'not judged'}. Too old to represent today: complete a check-in.`,
                `Dernière mesure : ${formatAge(zoneStatus.last_ts)}. Elle est trop ancienne pour représenter votre état actuel ; complétez un bilan.`,
              )}
        </p>
      )}
      {zone === 'muscles' && (
        <p className="assessment-muted">
          {t(
            'Exercise and weight are indirect indicators for the whole body, not muscle measurements.',
            'L’exercice et le poids sont des indicateurs indirects pour l’ensemble du corps, pas des mesures musculaires.',
          )}
        </p>
      )}
      <div
        className={`assessment-stack${zone === 'heart' ? ' hz-heart-readings' : ''}`}
        aria-label={t('Readings', 'Mesures')}
      >
        {meta.indicators.map((indicator) => {
          const level = zoneStatus.indicators[indicator];
          const Icon = level ? LEVEL_ICON[level] : null;
          return (
            <div key={indicator} className="hz-zone-reading">
              <span className="hz-zone-reading-label">
                <MeasurementIcon name={indicator} size={18} aria-hidden="true" />
                {t(INDICATOR_LABELS[indicator] ?? indicator)}
              </span>
              <span className="hz-zone-reading-value">
                <strong>{t(readingText(zoneStatus.display?.[indicator] ?? 'no data', locale))}</strong>
                {Icon && level && (
                  <Icon
                    size={16}
                    color={`var(--${level}-ink)`}
                    role="img"
                    aria-label={t(LEVEL_META[level].word)}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="hz-zone-action" data-level={zoneStatus.level}>
        <h3>{t('Next step', 'Prochaine étape')}</h3>
        <p>{t(meta.action)}</p>
        <p className="assessment-muted">{t('Indicative only — this is not a diagnosis.')}</p>
      </div>
      <details className="hz-help-answer" key={zone}>
        <summary>{t('Understand this result', 'Comprendre ce résultat')}</summary>
        <div className="hz-explanation">
          <section>
            <h3>{t('What sets the colour', 'Ce qui détermine la couleur')}</h3>
            <p>
              {zone === 'brain_morale'
                ? t(
                    'Mood, sleep, reported symptoms and earlier reaction readings.',
                    'Moral, sommeil, symptômes déclarés et anciennes mesures de réaction.',
                  )
                : t(meta.function)}
            </p>
          </section>
          {zone === 'brain_morale' && (
            <aside className="hz-guide-note hz-zone-note">
              <h3>
                <IconReaction size={18} aria-hidden="true" />
                {t('Your reaction test', 'Votre test de réaction')}
              </h3>
              <p>
                {t(
                  'Its results are kept separately. They do not change this colour.',
                  'Ses résultats sont conservés à part. Ils ne changent pas cette couleur.',
                )}
              </p>
            </aside>
          )}
          {thresholds && <ThresholdSummary indicators={meta.indicators} thresholds={thresholds} />}
          <section className="hz-guide-note hz-zone-note">
            <h3>
              <IconInfo size={18} aria-hidden="true" />
              {t('Why it matters in space', 'Pourquoi le suivre dans l’espace')}
            </h3>
            <p>{t(meta.why)}</p>
            <dl className="hz-guide-definitions hz-zone-context">
              <div>
                <dt>{t('NASA risk', 'Risque étudié par la NASA')}</dt>
                <dd>{t(zoneStatus.hazard)}</dd>
              </div>
              {contextNote && (
                <div>
                  <dt>{t('During this mission', 'Dans cette mission')}</dt>
                  <dd>{t(contextNote)}</dd>
                </div>
              )}
            </dl>
          </section>
          {thresholds && (
            <details className="hz-help-answer">
              <summary>{t('All colour rules', 'Toutes les règles de couleur')}</summary>
              <p>
                {t(
                  'Read in order: the first matching rule sets the colour. These rules are not medically validated.',
                  'Lecture dans l’ordre : la première règle applicable donne la couleur. Ces règles n’ont pas de validation médicale.',
                )}
              </p>
              <div className="hz-threshold-rules">
                {meta.indicators
                  .filter((key) => thresholds[key]?.rules?.length)
                  .map((key) => (
                    <ThresholdGuide
                      key={key}
                      label={t(INDICATOR_LABELS[key] ?? key)}
                      config={thresholds[key]}
                    />
                  ))}
              </div>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}

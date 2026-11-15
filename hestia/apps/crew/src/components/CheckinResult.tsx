import { useEffect, useRef } from 'react';
import type { CheckinResult as SavedCheckin } from '@hestia/api-client';
import {
  AdviceText,
  Button,
  IconCheck,
  IconCaution,
  IconCritical,
  StatusBadge,
  indicatorLabel,
  ZONE_META,
  ZONES,
  t,
} from '@hestia/ui';

export function CheckinResult({ result, onDone }: { result: SavedCheckin; onDone: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.scrollIntoView({ block: 'start' });
    heading.current?.focus({ preventScroll: true });
  }, []);
  const attention = ZONES.filter((zone) => ['orange', 'red'].includes(result.status[zone].level));
  const noData = ZONES.filter((zone) => result.status[zone].level === 'unknown');
  return (
    <div className="checkin-page checkin-result">
      <header className="checkin-result-heading">
        <IconCheck size={28} aria-hidden="true" />
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {t('Check-in saved')}
          </h1>
          <p>
            {t('Your answers are stored on the station.', 'Vos réponses sont enregistrées sur la station.')}
          </p>
        </div>
      </header>
      <section className="checkin-summary">
        <h2>
          {attention.length
            ? t('What needs attention', 'Les points à regarder')
            : t('Your health overview', 'Votre état en bref')}
        </h2>
        {attention.length ? (
          <ul className="checkin-zone-list">
            {attention.map((zone) => (
              <li key={zone}>
                <span>{t(ZONE_META[zone].label)}</span>
                <StatusBadge level={result.status[zone].level} />
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {noData.length === ZONES.length
              ? t(
                  'There are no recent readings to interpret yet.',
                  'Aucune mesure récente à interpréter pour le moment.',
                )
              : t(
                  'The assessed zones are within the demo’s indicative ranges.',
                  'Les zones évaluées sont dans les repères indicatifs de la démo.',
                )}
          </p>
        )}
        {noData.length > 0 && (
          <p className="checkin-missing">
            <strong>{t('No recent data:', 'Sans donnée récente :')}</strong>{' '}
            {noData.map((zone) => t(ZONE_META[zone].label)).join(', ')}.
          </p>
        )}
      </section>
      {result.alerts.map((alert) => (
        <section
          key={alert.id}
          className="checkin-advice"
          data-level={alert.level}
          role={alert.level === 'red' ? 'alert' : undefined}
        >
          <h2>
            {alert.level === 'red' ? <IconCritical size={18} /> : <IconCaution size={18} />}
            {t(
              alert.level === 'red' ? 'Crew alert' : 'Personal advice',
              alert.level === 'red' ? 'Alerte équipage' : 'Conseil personnel',
            )}{' '}
            · {indicatorLabel(alert.indicator)}
          </h2>
          <AdviceText message={alert.message} />
        </section>
      ))}
      <Button variant="primary" size="lg" onClick={onDone}>
        {t('See my body status')}
      </Button>
      <p className="checkin-note">
        {t(
          'Open a body zone to see its readings and explanations. Indicative rules, no diagnosis.',
          'Ouvrez une zone du corps pour retrouver ses mesures et ses explications. Règles indicatives, sans diagnostic.',
        )}
      </p>
    </div>
  );
}

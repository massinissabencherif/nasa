import { t } from '../i18n';

const image = new URL('../assets/hestia-pressure-monitor-v1.png', import.meta.url).href;
const READINGS: Record<string, { label: string; points: string }> = {
  systolic_bp: { label: 'SYS', points: '193,194 658,236 649,302 180,258' },
  diastolic_bp: { label: 'DIA', points: '177,281 642,322 630,388 162,344' },
  heart_rate: { label: 'PULSE', points: '158,367 625,409 613,475 144,431' },
};

/** Highlight the relevant display row without cropping the generated device. */
export function MonitorReadingGuide({ field }: { field: string }) {
  const reading = READINGS[field];
  if (!reading) return null;
  return (
    <figure className="hz-monitor-guide">
      <svg viewBox="0 0 1752 897" className="hz-monitor-screen" aria-hidden="true">
        <image href={image} width="1752" height="897" />
        <polygon
          points={reading.points}
          fill="var(--accent-dim)"
          stroke="var(--accent)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption>
        <p>
          {t('Find', 'Repérez')} <strong>{reading.label}</strong>{' '}
          {t(
            'on your device and enter the displayed number.',
            'sur votre appareil et saisissez le nombre affiché.',
          )}
        </p>
        <small>
          {t(
            'AI-generated illustration · concept device',
            'Illustration générée par IA · appareil conceptuel',
          )}
        </small>
      </figcaption>
    </figure>
  );
}

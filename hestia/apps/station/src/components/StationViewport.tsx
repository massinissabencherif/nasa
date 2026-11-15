import { useEffect, useState, type ReactNode } from 'react';
import { HestiaMark, LanguageSwitch, ProjectCredits, t, useLocale } from '@hestia/ui';
import { API_BASE } from '../lib/api';
import './station-viewport.css';

const media = '(max-width: 767px)';
function crewAddress() {
  const base = new URL(API_BASE, window.location.href);
  const loopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (loopback(base.hostname) && !loopback(window.location.hostname))
    base.hostname = window.location.hostname;
  return new URL('/crew/', base).href;
}
export function StationViewport({ children }: { children: ReactNode }) {
  useLocale();
  const [small, setSmall] = useState(() => window.matchMedia(media).matches);
  useEffect(() => {
    const query = window.matchMedia(media);
    const update = () => setSmall(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  if (!small) return children;
  return (
    <main className="station-phone-gate">
      <header>
        <HestiaMark size={36} />
        <strong>HESTIA</strong>
        <LanguageSwitch />
      </header>
      <h1>{t('The station opens on a computer', 'La station s’ouvre sur ordinateur')}</h1>
      <p>
        {t(
          'Mission setup, stock preparation and presentation tools need a larger screen.',
          'Les réglages de mission, la préparation du stock et les outils de présentation demandent un écran plus grand.',
        )}
      </p>
      <p>
        {t(
          'On your phone, use the crew app for your check-in, meals and stock photos.',
          'Sur votre téléphone, utilisez l’app équipage pour le bilan, les repas et les photos de réserve.',
        )}
      </p>
      <a className="hz-btn" data-variant="primary" href={crewAddress()}>
        {t('Open the crew app', 'Ouvrir l’app équipage')}
      </a>
      <p className="hz-caption">
        {t(
          'Connect to the station’s local Wi-Fi. The station must be running and reachable.',
          'Connectez-vous au Wi-Fi local de la station. Elle doit être démarrée et accessible.',
        )}
      </p>
      <footer>
        <p>{t('Simulated crew · not a medical device', 'Équipage simulé · prototype non médical')}</p>
        <ProjectCredits />
      </footer>
    </main>
  );
}

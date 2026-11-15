import { useState } from 'react';
import { t } from '../i18n';
import { DetailSheet } from './DetailSheet';
import esgi from '../assets/esgi.svg';
import spaceApps from '../assets/space-apps.svg';
import { HestiaMark } from '../icons';

export function ProjectIdentity() {
  return (
    <section className="hz-project-identity">
      <div className="hz-project-heading">
        <HestiaMark size={44} />
        <div>
          <h3>HESTIA</h3>
          <p>
            {t('Taking care of the crew, far from Earth.', 'Prendre soin de l’équipage, loin de la Terre.')}
          </p>
        </div>
      </div>
      <div className="hz-project-authors">
        <span>David Meguira</span>
        <span>Massinissa Bencherif</span>
      </div>
      <p>
        {t(
          'Built for NASA Space Apps Challenge 2026 · ESGI Paris',
          'Créé pour NASA Space Apps Challenge 2026 · ESGI Paris',
        )}
      </p>
      <div className="hz-project-marks">
        <span>
          <img src={esgi} alt="ESGI" width="68" height="50" />
        </span>
        <span>
          <img src={spaceApps} alt="NASA International Space Apps Challenge" width="144" height="56" />
        </span>
      </div>
      <p className="hz-caption">
        {t(
          'The companion and blood-pressure monitor illustrations were generated with AI.',
          'Les illustrations du compagnon et du tensiomètre ont été générées par IA.',
        )}
      </p>
      <p className="hz-caption">
        {t(
          'Independent student prototype, not an official NASA application.',
          'Prototype étudiant indépendant, pas une application officielle de la NASA.',
        )}
      </p>
    </section>
  );
}

/** Full credits live off the working screen, so a phone keeps its useful space. */
export function ProjectCredits({ names = false }: { names?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hz-project-credit-link" onClick={() => setOpen(true)}>
        {names ? 'David Meguira · Massinissa Bencherif' : t('Project credits', 'Crédits du projet')}
      </button>
      {open && (
        <DetailSheet title={t('About the project', 'À propos du projet')} onClose={() => setOpen(false)}>
          <ProjectIdentity />
        </DetailSheet>
      )}
    </>
  );
}

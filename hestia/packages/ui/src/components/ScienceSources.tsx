import { t } from '../i18n';
import { HelpButton } from './HelpButton';

/** Provenance is available offline. Full source URLs and the verification
 * record are in docs/nasa-resources.md; this is not live telemetry. */
export function ScienceSources() {
  return (
    <div className="hz-source-help">
      <span>{t('What comes from NASA?', 'Quelles références viennent de la NASA ?')}</span>
      <HelpButton label={t('Data and scientific sources', 'Données et sources scientifiques')}>
        <section>
          <h3>{t('Measured by a NASA mission', 'Mesuré par une mission NASA')}</h3>
          <p>
            {t(
              'Curiosity’s RAD instrument measured the radiation environment on Mars. HESTIA uses a published historical reference for its fictional mission context, not a live sensor feed or an astronaut’s measured dose.',
              'L’instrument RAD de Curiosity a mesuré les radiations sur Mars. HESTIA utilise une référence historique publiée pour son contexte fictif, pas un capteur en direct ni la dose mesurée d’un astronaute.',
            )}
          </p>
          <p>
            {t(
              'Source: NASA / Curiosity RAD, Gale Crater, August 2012–June 2013.',
              'Source : NASA / Curiosity RAD, cratère Gale, août 2012–juin 2013.',
            )}
          </p>
        </section>
        <section>
          <h3>{t('NASA references', 'Références NASA')}</h3>
          <p>
            {t(
              'NASA-STD-3001 provides the career radiation limit. The Human Research Program describes five spaceflight hazards. Our reaction task is inspired by the ISS Reaction Self-Test; our short protocol has not been clinically validated.',
              'NASA-STD-3001 fournit la limite de radiation sur la carrière. Le programme HRP décrit cinq risques des vols spatiaux. Notre test de réaction s’inspire du Reaction Self-Test de l’ISS ; notre protocole court n’a pas de validation clinique.',
            )}
          </p>
        </section>
        <section>
          <h3>{t('Simulated or chosen for the demo', 'Simulé ou choisi pour la démo')}</h3>
          <p>
            {t(
              'The crew, their health history and Earth replies are fictional. Colour thresholds and escalation rules are demo choices. The lunar reference is from Chang’e-4, not NASA. The ISS dose rate remains an assumption. Radiation comparisons here are a simplified demonstration, not personal dosimetry.',
              'L’équipage, son historique de santé et les réponses de la Terre sont fictifs. Les seuils et règles d’alerte sont choisis pour la démo. La référence lunaire vient de Chang’e-4, pas de la NASA. Le débit de dose ISS reste une hypothèse. Les comparaisons de radiations sont une démonstration simplifiée, pas une dosimétrie personnelle.',
            )}
          </p>
        </section>
      </HelpButton>
    </div>
  );
}

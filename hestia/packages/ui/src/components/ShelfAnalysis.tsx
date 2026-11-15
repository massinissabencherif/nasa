import { StationCompanion } from './StationCompanion';
import { t } from '../i18n';

export function ShelfAnalysis({ elapsed }: { elapsed: number }) {
  return (
    <div className="hz-shelf-analysis">
      <StationCompanion animated />
      <div role="status" className="hz-shelf-analysis-status">
        <span className="hz-spinner" aria-hidden="true" />
        <strong>{t('Counting on the station', 'Comptage sur la station')}</strong>
      </div>
      <p className="hz-shelf-analysis-time">
        {t('Elapsed time', 'Temps écoulé')} · <span>{elapsed} s</span>
      </p>
      <p>
        {t(
          'The local model is examining your photo. You will check its proposed quantities next.',
          'Le modèle local examine votre photo. Vous pourrez ensuite vérifier les quantités proposées.',
        )}
      </p>
      <p className="hz-caption">
        {t(
          'Stock stays unchanged until you save. You can close this panel; the current analysis will finish in the background and its result will be discarded.',
          'Le stock reste inchangé jusqu’à votre enregistrement. Vous pouvez fermer cette fiche ; l’analyse en cours se terminera en arrière-plan et son résultat sera abandonné.',
        )}
      </p>
    </div>
  );
}

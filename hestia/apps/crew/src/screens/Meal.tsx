import { useRef, useState } from 'react';
import { Button, FoodIcon, IconCheck, LoadingState, LoadError, Panel, dateLocale, t } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import './meal.css';
import { useMealProposal, useSelectedCrewId } from '../lib/hooks';

export function Meal() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const { proposal, error: loadError, refresh } = useMealProposal(crewId);
  const saving = useRef(false);
  const [eating, setEating] = useState<number | 'suggestion' | null>(null);
  const [error, setError] = useState(false);
  const [receipt, setReceipt] = useState<string[]>([]);

  async function eat(items: { food_item_id: number; name: string }[], marker: number | 'suggestion') {
    if (crewId == null || saving.current) return;
    saving.current = true;
    setEating(marker);
    setError(false);
    setReceipt([]);
    const confirmed: string[] = [];
    try {
      for (const item of items) {
        await api.eatMeal(crewId, item.food_item_id, 1);
        confirmed.push(item.name);
        setReceipt([...confirmed]);
      }
    } catch {
      setError(true);
    } finally {
      refresh();
      setEating(null);
      saving.current = false;
    }
  }

  if (!proposal)
    return (
      <div className="hz-home meal-page">
        {loadError ? (
          <LoadError
            label={t('Stock could not load.', 'Impossible de charger le stock.')}
            onRetry={refresh}
          />
        ) : (
          <LoadingState label={t('Loading the stock…')} />
        )}
      </div>
    );

  const progress = proposal.daily_need_kcal
    ? Math.min(100, (proposal.kcal_eaten_today / proposal.daily_need_kcal) * 100)
    : 0;
  const suggestionKcal = proposal.suggestion.reduce((sum, item) => sum + item.kcal, 0);

  return (
    <div className="hz-home meal-page">
      <h1>{t('Meals', 'Repas')}</h1>
      <section className="hz-meal-progress" aria-label={t('Today', 'Aujourd’hui')}>
        <div>
          <span>{t('Logged today', 'Enregistré aujourd’hui')}</span>
          <strong>
            {Math.round(proposal.kcal_eaten_today).toLocaleString(dateLocale())} <small>kcal</small>
          </strong>
        </div>
        <p>
          {t('Estimated need:', 'Besoin estimé :')}{' '}
          {Math.round(proposal.daily_need_kcal).toLocaleString(dateLocale())} kcal
        </p>
        <progress
          max="100"
          value={progress}
          aria-label={t(
            'Logged energy against estimated need',
            'Énergie enregistrée par rapport au besoin estimé',
          )}
        />
        <details className="hz-help-answer">
          <summary>{t('How is this estimated?', 'Comment est-ce estimé ?')}</summary>
          <p>
            {t(
              'The need is an estimate (Mifflin-St Jeor × activity factor, a ground formula). Only meals you log here count as eaten.',
            )}
          </p>
        </details>
      </section>

      {receipt.length > 0 && (
        <div className="hz-meal-receipt" role="status" aria-live="polite" aria-atomic="true">
          <IconCheck size={18} aria-hidden="true" />
          <p>
            <strong>{t('Recorded:', 'Enregistré :')}</strong> {receipt.map((name) => t(name)).join(' + ')}.{' '}
            {t(
              'One catalogue unit of each deducted from expected stock.',
              'Une unité du catalogue de chaque aliment déduite du stock prévu.',
            )}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="assessment-notice">
          {t(
            'Recording was interrupted. Confirmed units are listed above. Refresh and check before trying again.',
            'L’enregistrement a été interrompu. Les unités confirmées sont indiquées ci-dessus. Actualisez et vérifiez avant de réessayer.',
          )}
        </p>
      )}
      {loadError && (
        <LoadError
          label={t(
            'Stock could not refresh. Displayed quantities may be outdated.',
            'Actualisation du stock impossible. Les quantités affichées peuvent être anciennes.',
          )}
          onRetry={refresh}
        />
      )}

      {proposal.suggestion.length > 0 && (
        <Panel title={t('Meal suggestion', 'Suggestion de repas')}>
          <div className="hz-meal-suggestion">
            {proposal.suggestion.map((item) => (
              <div key={item.food_item_id}>
                <FoodIcon name={item.name} />
                <span>{t(item.name)}</span>
              </div>
            ))}
          </div>
          <p className="hz-meal-caption">
            {Math.round(suggestionKcal).toLocaleString(dateLocale())} kcal ·{' '}
            {t('1 unit of each · from recorded stock', '1 unité de chaque · selon le stock enregistré')}
          </p>
          <Button
            variant="primary"
            size="lg"
            loading={eating === 'suggestion'}
            disabled={eating != null || loadError}
            onClick={() => eat(proposal.suggestion, 'suggestion')}
          >
            {eating === 'suggestion'
              ? t('Recording…', 'Enregistrement…')
              : t('Log this meal', 'Enregistrer ce repas')}
          </Button>
        </Panel>
      )}

      <details className="hz-help-answer meal-unit-guide">
        <summary>{t('1 unit = a catalogue package', '1 unité = un emballage du catalogue')}</summary>
        <p className="hz-meal-caption">
          {t(
            'One unit uses the catalogue’s nutrition values, entered per whole package. It is not a personalised serving. The mission demo multiplier creates virtual units: it does not add real food. Logging an individual food subtracts one unit; a scan only counts packages.',
            'Une unité utilise les valeurs du catalogue, saisies pour un emballage entier. Ce n’est pas une portion adaptée à la personne. Le multiplicateur de mission crée des unités virtuelles, sans ajouter d’aliments réels. Enregistrer un aliment retire une unité ; un scan compte les emballages.',
          )}
        </p>
      </details>
      <section className="hz-food-section">
        <h2>{t('Choose from the reserve', 'Choisir dans la réserve')}</h2>
        <p className="hz-meal-caption">
          {t(
            'Choose food you actually consumed, then record it. The list comes from the station’s recorded inventory.',
            'Choisissez ce que vous avez consommé, puis enregistrez-le. La liste vient de l’inventaire de la station.',
          )}
        </p>
        {proposal.available.length === 0 ? (
          <p>
            {t(
              'No stock recorded. Ask the station to check the reserve.',
              'Aucun stock enregistré. Demandez une vérification de la réserve à la station.',
            )}
          </p>
        ) : (
          <div className="hz-food-list">
            {proposal.available.map((item) => (
              <article className="hz-food-card" key={item.food_item_id}>
                <FoodIcon name={item.name} />
                <div className="hz-food-description">
                  <h3>{t(item.name)}</h3>
                  <p>
                    <strong>{item.kcal.toLocaleString(dateLocale())} kcal</strong> ·{' '}
                    {t('per catalogue unit', 'par unité du catalogue')}
                  </p>
                  <p>
                    {item.available_count.toLocaleString(dateLocale())}{' '}
                    {t('packages counted', 'emballages comptés')}
                  </p>
                </div>
                <Button
                  loading={eating === item.food_item_id}
                  disabled={eating != null || loadError}
                  onClick={() => eat([item], item.food_item_id)}
                >
                  {eating === item.food_item_id
                    ? t('Recording…', 'Enregistrement…')
                    : t('Log 1 unit', 'Enregistrer 1 unité')}
                </Button>
                <details className="hz-food-macros">
                  <summary>{t('Nutritional details', 'Détail nutritionnel')}</summary>
                  <p className="meal-unit-note">
                    {item.available_portions.toLocaleString(dateLocale())}{' '}
                    {t(
                      'catalogue units left in the projection.',
                      'unités du catalogue restantes dans la projection.',
                    )}
                  </p>
                  <p>
                    {t('Protein', 'Protéines')} {item.protein_g} g · {t('Carbs', 'Glucides')} {item.carbs_g} g
                    · {t('Fat', 'Lipides')} {item.fat_g} g
                  </p>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

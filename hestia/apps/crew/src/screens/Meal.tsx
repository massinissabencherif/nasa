import { useRef, useState } from 'react';
import { Button, FoodIcon, IconCheck, LoadingState, LoadError, Panel, t } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
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
      <div className="hz-home">
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
    <div className="hz-home">
      <h1>{t('Meals', 'Repas')}</h1>
      <section className="hz-meal-progress" aria-label={t('Today', 'Aujourd’hui')}>
        <div>
          <span>{t('Logged today', 'Enregistré aujourd’hui')}</span>
          <strong>
            {Math.round(proposal.kcal_eaten_today)} <small>kcal</small>
          </strong>
        </div>
        <p>
          {t('Estimated need:', 'Besoin estimé :')} {Math.round(proposal.daily_need_kcal)} kcal
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

      <div aria-live="polite" aria-atomic="true">
        {receipt.length > 0 && (
          <div className="hz-meal-receipt">
            <IconCheck size={18} aria-hidden="true" />
            <p>
              <strong>{t('Recorded:', 'Enregistré :')}</strong> {receipt.map((name) => t(name)).join(' + ')}.{' '}
              {t('One portion of each.', 'Une portion de chaque.')}
            </p>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="assessment-notice">
          {t(
            'Recording was interrupted. Confirmed portions are listed above. Refresh and check before trying again.',
            'L’enregistrement a été interrompu. Les portions confirmées sont indiquées ci-dessus. Actualisez et vérifiez avant de réessayer.',
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
            {Math.round(suggestionKcal)} kcal ·{' '}
            {t('1 portion of each · from recorded stock', '1 portion de chaque · selon le stock enregistré')}
          </p>
          <Button
            variant="primary"
            size="lg"
            disabled={eating != null}
            onClick={() => eat(proposal.suggestion, 'suggestion')}
          >
            {eating === 'suggestion'
              ? t('Recording…', 'Enregistrement…')
              : t('Log this meal', 'Enregistrer ce repas')}
          </Button>
        </Panel>
      )}

      <section className="hz-food-section">
        <h2>{t('Choose from the reserve', 'Choisir dans la réserve')}</h2>
        <p className="hz-meal-caption">
          {t(
            'Based on the latest recorded inventory: scan, correction or simulation. Counts are estimates until checked.',
            'D’après le dernier inventaire : scan, correction ou simulation. Les quantités restent des estimations avant vérification.',
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
                    <strong>{item.kcal} kcal</strong> · {t('per demo portion', 'par portion de démo')}
                  </p>
                  <p>
                    {item.available_portions} {t('portions remaining', 'portions restantes')}
                  </p>
                </div>
                <details className="hz-food-macros">
                  <summary>{t('Nutritional details', 'Détail nutritionnel')}</summary>
                  <p>
                    {t('Protein', 'Protéines')} {item.protein_g} g · {t('Carbs', 'Glucides')} {item.carbs_g} g
                    · {t('Fat', 'Lipides')} {item.fat_g} g
                  </p>
                </details>
                <Button disabled={eating != null} onClick={() => eat([item], item.food_item_id)}>
                  {eating === item.food_item_id
                    ? t('Recording…', 'Enregistrement…')
                    : t('Log 1 portion', 'Enregistrer 1 portion')}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="hz-meal-caption">
        {t(
          'Demo catalogue: nutrition values and the conversion from boxes to portions are simulated. Logging a meal deducts its portions from the expected stock; scanning the shelf does not log a meal.',
          'Catalogue de démo : valeurs nutritionnelles et conversion des boîtes en portions simulées. Enregistrer un repas déduit ses portions du stock prévu ; scanner la réserve n’enregistre pas un repas.',
        )}
      </p>
    </div>
  );
}

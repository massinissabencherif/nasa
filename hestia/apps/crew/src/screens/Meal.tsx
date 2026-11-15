import { useEffect, useRef, useState } from 'react';
import type { MealItem, MealProposal } from '@hestia/api-client';
import {
  Button,
  DetailSheet,
  FoodIcon,
  IconCheck,
  LoadingState,
  LoadError,
  Panel,
  dateLocale,
  parseServerTime,
  t,
} from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import './meal.css';
import { useMealProposal, useSelectedCrewId } from '../lib/hooks';

export function Meal() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const { proposal, error: loadError, refresh } = useMealProposal(crewId);
  const saving = useRef(false);
  const [eating, setEating] = useState<number | 'suggestion' | 'undo' | null>(null);
  const [error, setError] = useState(false);
  const [receipt, setReceipt] = useState<MealItem[]>([]);
  const [undoTarget, setUndoTarget] = useState<NonNullable<MealProposal['consumed_today']>[number] | null>(
    null,
  );
  const [undoError, setUndoError] = useState(false);
  const [undoNotice, setUndoNotice] = useState<string | null>(null);
  const refreshingFrom = useRef<MealProposal | null>(null);
  const latestProposal = useRef(proposal);
  useEffect(() => {
    latestProposal.current = proposal;
  }, [proposal]);
  useEffect(() => {
    if (!refreshingFrom.current || (proposal === refreshingFrom.current && !loadError)) return;
    refreshingFrom.current = null;
    saving.current = false;
    setEating(null);
  }, [proposal, loadError]);

  async function eat(items: { food_item_id: number; name: string }[], marker: number | 'suggestion') {
    if (crewId == null || saving.current) return;
    saving.current = true;
    setEating(marker);
    setError(false);
    setReceipt([]);
    setUndoNotice(null);
    const confirmed: MealItem[] = [];
    try {
      for (const item of items) {
        await api.eatMeal(crewId, item.food_item_id, 1);
        const recorded = proposal?.available.find((food) => food.food_item_id === item.food_item_id);
        if (recorded) confirmed.push(recorded);
        setReceipt([...confirmed]);
      }
    } catch {
      setError(true);
    } finally {
      refreshingFrom.current = latestProposal.current;
      refresh();
    }
  }

  async function undo() {
    if (!undoTarget || crewId == null || saving.current) return;
    saving.current = true;
    setEating('undo');
    setUndoError(false);
    setReceipt([]);
    try {
      const result = await api.cancelMeal(crewId, undoTarget.id);
      setUndoNotice(
        result.stock_needs_check
          ? t(
              'Consumption cancelled and calories removed. Stock was updated since: check the remaining products; no automatic addition.',
              'Consommation annulée et calories retirées. Le stock a changé depuis : vérifiez les produits restants, aucun ajout automatique.',
            )
          : t(
              `Consumption cancelled. ${result.restored_qty} unit(s) returned to stock.`,
              `Consommation annulée. ${result.restored_qty} unité(s) rendue(s) au stock.`,
            ),
      );
      setUndoTarget(null);
    } catch {
      setUndoError(true);
    } finally {
      refreshingFrom.current = latestProposal.current;
      refresh();
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
  const choices = [
    ...proposal.available,
    ...receipt
      .filter((item) => !proposal.available.some((food) => food.food_item_id === item.food_item_id))
      .map((item) => ({ ...item, available_count: 0, available_portions: 0 })),
  ];
  const suggestionKcal = proposal.suggestion.reduce((sum, item) => sum + item.kcal, 0);

  return (
    <div className="hz-home meal-page">
      <h1>{t('Meals and drinks', 'Repas et boissons')}</h1>
      <p className="hz-meal-caption">
        {t(
          'Record what you consumed. One click removes one whole catalogue package from stock.',
          'Enregistrez ce que vous avez consommé. Un clic retire un emballage entier du stock.',
        )}
      </p>
      {receipt.length > 0 && (
        <div className="hz-meal-receipt" role="status" aria-live="polite" aria-atomic="true">
          <IconCheck size={18} aria-hidden="true" />
          <p>
            <strong>{t('Consumption recorded:', 'Consommation enregistrée :')}</strong>{' '}
            {receipt
              .map(
                (item) =>
                  `${t(item.name)} −1${eating == null ? ` · ${proposal.available.find((food) => food.food_item_id === item.food_item_id)?.available_count ?? 0} ${t('left', 'en stock')}` : ''}`,
              )
              .join(' ; ')}
          </p>
        </div>
      )}
      {undoNotice && (
        <p className="hz-meal-receipt" role="status">
          {undoNotice}
        </p>
      )}
      {error && (
        <p role="alert" className="assessment-notice">
          {t(
            'Recording was interrupted or stock changed. Only successful entries appear above. Check the remaining quantities before trying again.',
            'L’enregistrement a été interrompu ou le stock a changé. Seules les réussites sont indiquées ci-dessus. Vérifiez le stock restant avant de réessayer.',
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

      <section className="meal-today" aria-label={t('Consumed today', 'Consommé aujourd’hui')}>
        <div className="meal-today-heading">
          <h2>{t('Consumed today', 'Consommé aujourd’hui')}</h2>
          <strong>
            {Math.round(proposal.kcal_eaten_today).toLocaleString(dateLocale())} <small>kcal</small>
          </strong>
        </div>
        {(proposal.consumed_today ?? []).length === 0 ? (
          <p className="hz-meal-caption">
            {t('Nothing recorded yet.', 'Aucune consommation enregistrée pour le moment.')}
          </p>
        ) : (
          <ul>
            {(proposal.consumed_today ?? []).map((item) => (
              <li key={item.id} data-cancelled={item.cancelled || undefined}>
                <span>
                  {item.qty} × {t(item.name)}
                  {item.cancelled && <small> · {t('Cancelled', 'Annulé')}</small>}
                </span>
                <time dateTime={item.ts}>
                  {new Date(parseServerTime(item.ts)).toLocaleTimeString(dateLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                {!item.cancelled && (
                  <Button
                    size="sm"
                    disabled={eating != null || loadError}
                    onClick={() => {
                      setUndoError(false);
                      setUndoTarget(item);
                    }}
                  >
                    {t('Undo', 'Annuler')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="hz-food-section">
        <h2>{t('Available to consume', 'Disponibles dans la réserve')}</h2>
        <p className="hz-meal-caption">
          {t(
            'Choose food you actually consumed, then record it. The list comes from the station’s recorded inventory.',
            'Choisissez ce que vous avez consommé, puis enregistrez-le. La liste vient de l’inventaire de la station.',
          )}
        </p>
        {choices.length === 0 ? (
          <p>
            {t(
              'No products left. Check or add stock from Pantry.',
              'Aucun produit disponible. Vérifiez ou ajoutez du stock depuis Réserve.',
            )}
          </p>
        ) : (
          <div className="hz-food-list">
            {choices.map((item) => (
              <article className="hz-food-card" key={item.food_item_id} data-food-id={item.food_item_id}>
                <FoodIcon name={item.name} />
                <div className="hz-food-description">
                  <h3>{t(item.name)}</h3>
                  <p className="meal-available">
                    <strong>{item.available_count.toLocaleString(dateLocale())}</strong>{' '}
                    {t('available', item.available_count > 1 ? 'disponibles' : 'disponible')}
                  </p>
                  <p>
                    {item.kcal.toLocaleString(dateLocale())} kcal ·{' '}
                    {t('per whole package', 'par emballage entier')}
                  </p>
                </div>
                <Button
                  loading={eating === item.food_item_id}
                  disabled={eating != null || loadError || item.available_count === 0}
                  onClick={() => eat([item], item.food_item_id)}
                >
                  {eating === item.food_item_id
                    ? t('Recording…', 'Enregistrement…')
                    : item.available_count === 0
                      ? t('Out of stock', 'Épuisé')
                      : /juice/i.test(item.name)
                        ? t('I drank 1 juice', 'J’ai bu 1 jus')
                        : /water/i.test(item.name)
                          ? t('I drank 1 unit', 'J’ai bu 1 unité')
                          : t('I consumed 1 unit', 'J’ai consommé 1 unité')}
                </Button>
                {receipt.some((food) => food.food_item_id === item.food_item_id) && (
                  <p className="meal-inline-confirmation">
                    <IconCheck size={16} aria-hidden="true" />
                    {t('1 unit recorded', '1 unité enregistrée')}
                    {eating == null ? ` · ${item.available_count} ${t('left', 'en stock')}` : ''}
                  </p>
                )}
                <details className="hz-food-macros">
                  <summary>{t('Nutritional details', 'Détail nutritionnel')}</summary>
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
      {proposal.suggestion.length > 0 && (
        <details className="hz-help-answer">
          <summary>{t('A meal idea?', 'Une idée de repas ?')}</summary>{' '}
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
                  : t('I consumed this meal', 'J’ai consommé ce repas')}
              </Button>
            </Panel>
          )}
        </details>
      )}
      <details className="hz-help-answer meal-unit-guide">
        <summary>{t('1 unit = a catalogue package', '1 unité = un emballage du catalogue')}</summary>
        <p className="hz-meal-caption">
          {t(
            'One unit uses the catalogue’s nutrition values for one whole package. It is not a personalised serving. The mission multiplier is used only for simulations: it never adds real food. Logging food removes one real package.',
            'Une unité utilise les valeurs du catalogue pour un emballage entier. Ce n’est pas une portion adaptée à la personne. Le multiplicateur sert uniquement aux simulations : il n’ajoute pas de produits réels. Enregistrer un aliment retire un emballage du stock.',
          )}
        </p>
      </details>
      <details className="hz-help-answer">
        <summary>{t('Energy and estimated needs', 'Calories et besoin estimé')}</summary>{' '}
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
      </details>
      {undoTarget && (
        <DetailSheet
          variant="modal"
          dismissible={eating !== 'undo'}
          title={t('Cancel this consumption?', 'Annuler cette consommation ?')}
          onClose={() => {
            if (eating !== 'undo') setUndoTarget(null);
          }}
        >
          <p>
            <strong>
              {undoTarget.qty} × {t(undoTarget.name)}
            </strong>
          </p>
          <p>
            {t(
              'Its calories will be removed from today’s log. The stock is restored only if it has not been recounted since.',
              'Ses calories seront retirées du journal du jour. Le stock sera rétabli seulement s’il n’a pas été recompté depuis.',
            )}
          </p>
          {undoError && (
            <p role="alert">
              {t(
                'Cancellation failed. Check the station and retry.',
                'L’annulation a échoué. Vérifiez la station puis réessayez.',
              )}
            </p>
          )}
          <Button variant="primary" loading={eating === 'undo'} onClick={() => void undo()}>
            {t('Cancel this entry', 'Annuler cet enregistrement')}
          </Button>
          <Button disabled={eating === 'undo'} onClick={() => setUndoTarget(null)}>
            {t('Keep this entry', 'Garder cet enregistrement')}
          </Button>
        </DetailSheet>
      )}
    </div>
  );
}

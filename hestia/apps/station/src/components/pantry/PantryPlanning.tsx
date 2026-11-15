import type { ConsumptionEvent, RationPlan } from '@hestia/api-client';
import { Button, DetailSheet, Input, Panel, StatusBadge, dateLocale, parseServerTime, t } from '@hestia/ui';

export function PantryPlanning({
  days,
  onDays,
  plan,
  resupply,
  open,
  onClose,
}: {
  days: number;
  onDays: (days: number) => void;
  plan: RationPlan | null;
  resupply: number | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="pantry-secondary">
      {open && (
        <DetailSheet
          title={t('Supply delay · simulation', 'Retard de ravitaillement · simulation')}
          onClose={onClose}
        >
          <div className="pantry-scenario-body">
            <p>
              {t(
                'A simulation to compare supplies. It does not change meals or prescribe a diet.',
                'Une simulation pour comparer les réserves. Elle ne modifie aucun repas et ne prescrit pas de régime.',
              )}
            </p>
            <div className="pantry-actions">
              <label htmlFor="ration-days">{t('Stock must last', 'Faire tenir le stock')}</label>
              <Input
                id="ration-days"
                type="number"
                min={1}
                max={2000}
                value={days}
                onChange={(e) => onDays(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))}
                style={{ width: 88 }}
              />
              <span>{t('days', 'jours')}</span>
              {resupply != null && (
                <>
                  <Button size="sm" onClick={() => onDays(resupply)}>
                    {t('Until cargo', 'Jusqu’au ravitaillement')}
                  </Button>
                  <Button size="sm" onClick={() => onDays(resupply + 60)}>
                    {t('Cargo 60 days late', 'Ravitaillement retardé de 60 j')}
                  </Button>
                </>
              )}
            </div>
            {plan ? (
              <>
                <p>
                  <strong>
                    {plan.ration_pct >= 100
                      ? t('Estimated needs covered', 'Besoins estimés couverts')
                      : t('Estimated energy shortfall', 'Manque d’énergie estimé')}
                  </strong>
                  <br />
                  <strong>{Math.round(plan.ration_pct)} %</strong>{' '}
                  {t(
                    'of each astronaut’s estimated daily need',
                    'du besoin quotidien estimé de chaque astronaute',
                  )}
                  .
                </p>
                {plan.below_safety_floor && (
                  <StatusBadge
                    level="red"
                    label={t(
                      `Below the demo floor of ${plan.safety_floor_pct}%`,
                      `Sous le plancher de démo de ${plan.safety_floor_pct} %`,
                    )}
                  />
                )}
                <div className="pantry-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Astronaut', 'Astronaute')}</th>
                        <th>kcal/{t('day', 'jour')}</th>
                        <th>{t('Protein / carbs / fat (g)', 'Protéines / glucides / lipides (g)')}</th>
                        <th>{t('Weight change (kg)', 'Variation de poids (kg)')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.per_crew.map((line) => (
                        <tr key={line.crew_member_id}>
                          <th>{line.name}</th>
                          <td>{line.ration_kcal}</td>
                          <td>
                            {line.protein_g} / {line.carbs_g} / {line.fat_g}
                          </td>
                          <td>
                            {line.weight_change_kg > 0 ? '+' : ''}
                            {line.weight_change_kg.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="pantry-note">
                  {t('Model assumptions (server):', 'Hypothèses du modèle (serveur) :')}{' '}
                  {t(
                    'Energy needs are terrestrial estimates. Weight change uses a linear approximation of 7,700 kcal per kg. Below 70% of estimated need, the demo flags the scenario as unsafe; this is not a validated medical threshold.',
                    'Les besoins sont des estimations terrestres. La variation de poids utilise une approximation linéaire de 7 700 kcal par kg. Sous 70 % du besoin estimé, la démo signale le scénario comme risqué ; ce seuil n’est pas médicalement validé.',
                  )}
                </p>
              </>
            ) : (
              <p role="status">
                {t('Scenario unavailable or updating.', 'Scénario indisponible ou en cours de mise à jour.')}
              </p>
            )}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}

export function PantryMovements({
  consumption,
  feedError,
}: {
  consumption: ConsumptionEvent[];
  feedError: boolean;
}) {
  return (
    <Panel title={t('Recent stock movements', 'Derniers mouvements de stock')}>
      <div>
        {feedError ? (
          <p role="alert">
            {t('Stock movements could not be loaded.', 'Les mouvements de stock n’ont pas pu être chargés.')}
          </p>
        ) : consumption.length === 0 ? (
          <p>{t('No movement recorded yet.', 'Aucun mouvement enregistré.')}</p>
        ) : (
          <ul className="pantry-feed">
            {consumption.slice(0, 12).map((event) => (
              <li key={event.id}>
                <span>
                  <strong>
                    {event.qty > 0 ? '+' : '−'}
                    {Math.abs(event.qty)}{' '}
                    {event.unit === 'portion'
                      ? Math.abs(event.qty) === 1
                        ? t('unit', 'unité')
                        : t('units', 'unités')
                      : Math.abs(event.qty) === 1
                        ? t('box', 'boîte')
                        : t('boxes', 'boîtes')}
                  </strong>{' '}
                  · {t(event.food_name ?? `#${event.food_item_id}`)}
                  <small>
                    {event.cancelled
                      ? t('Cancelled', 'Annulé')
                      : event.crew_name
                        ? `${t('Meal', 'Repas')} · ${event.crew_name}`
                        : t('Shelf count change', 'Changement de comptage')}
                  </small>
                </span>
                <time dateTime={event.ts}>
                  {new Date(parseServerTime(event.ts)).toLocaleString(dateLocale(), {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

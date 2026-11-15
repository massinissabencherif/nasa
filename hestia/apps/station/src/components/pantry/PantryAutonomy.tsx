import { useState } from 'react';
import type { MissionContext, PantryState } from '@hestia/api-client';
import {
  Button,
  DetailSheet,
  FoodIcon,
  MissionIllustration,
  MissionBrief,
  MissionHeading,
  IconClock,
  IconCargo,
  IconCheck,
  IconCaution,
  Panel,
  ReadoutNumber,
  StatusBadge,
  dateLocale,
  t,
} from '@hestia/ui';

function MissionProjection({
  pantry,
  context,
  reviewCount,
  onReview,
}: {
  pantry: PantryState | null;
  context: MissionContext | null;
  reviewCount: number;
  onReview: () => void;
}) {
  const resupply = context?.next_resupply_in_days ?? null;
  const margin = pantry && resupply != null ? pantry.autonomy_days - resupply : null;
  const scale = Math.max(pantry?.autonomy_days ?? 0, resupply ?? 0, 1) * 1.1;
  return (
    <Panel className="pantry-autonomy">
      <div className="pantry-stage-heading">
        <IconClock size={22} />
        <div>
          <h2>{t('Estimated food autonomy', 'Autonomie alimentaire estimée')}</h2>
          <p>
            {t(
              `Demo projection ×${pantry?.units_per_lot ?? '…'}`,
              `Projection de démo ×${pantry?.units_per_lot ?? '…'}`,
            )}
          </p>
        </div>
      </div>
      {pantry ? (
        <>
          <p className="pantry-estimate-label">
            {pantry.slots.some(
              (s) => s.food_item_id != null && (s.source !== 'manual' || s.needs_confirmation),
            ) ? (
              <>
                <IconCaution size={15} />
                {t('Estimate · counts still to check', 'Estimation · comptage à contrôler')}
              </>
            ) : (
              <>
                <IconCheck size={15} />
                {t('Estimate · counts manually checked', 'Estimation · comptage vérifié manuellement')}
              </>
            )}
          </p>
          <div className="pantry-days">
            <ReadoutNumber value={pantry.autonomy_days} floor size="var(--text-display)" durationMs={400} />
            <span>{t('simulated days for the crew', 'jours simulés pour l’équipage')}</span>
          </div>
          <div className="pantry-autonomy-reference">
            {resupply != null && margin != null ? (
              <>
                <div className="pantry-gauge" aria-hidden="true">
                  <span style={{ width: `${(pantry.autonomy_days / scale) * 100}%` }} />
                  <i style={{ left: `${(resupply / scale) * 100}%` }} />
                </div>
                <dl className="pantry-cargo-reference">
                  <div>
                    <dt>
                      <IconCargo size={18} />
                      {t('Next supply', 'Ravitaillement')}
                    </dt>
                    <dd>
                      {resupply} <small>{t('days', 'jours')}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      {margin >= 0
                        ? t('Days left at supply', 'Réserve à l’arrivée')
                        : t('Shortfall', 'Manque estimé')}
                    </dt>
                    <dd data-short={margin < 0 || undefined}>
                      {margin < 0 ? Math.ceil(-margin) : Math.floor(margin)}{' '}
                      <small>{t('days', 'jours')}</small>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p>
                {t('No cargo planned for this mission.', 'Aucun ravitaillement prévu pour cette mission.')}
              </p>
            )}
            {margin != null && margin < 0 && (
              <StatusBadge
                level="red"
                label={t('Stock does not reach the next cargo', 'Stock insuffisant jusqu’au ravitaillement')}
              />
            )}
          </div>
          <div className="pantry-review-callout">
            <p>
              {reviewCount
                ? t(
                    `${reviewCount} uncertain count${reviewCount === 1 ? '' : 's'}`,
                    `${reviewCount} quantité${reviewCount === 1 ? '' : 's'} incertaine${reviewCount === 1 ? '' : 's'}`,
                  )
                : t('Based on the recorded stock', 'À partir du stock enregistré')}
            </p>
            <Button size="sm" onClick={onReview}>
              {t('Review inventory', 'Vérifier le stock')}
            </Button>
          </div>
          <p className="pantry-projection-note">
            <strong>
              {t('Demo scale:', 'Échelle de démo :')} ×{pantry.units_per_lot}.
            </strong>{' '}
            {t(
              'Each counted package represents this many catalogue units. These days are simulated, not the actual food in the photo. The supply date is also an assumption.',
              'Chaque emballage représente autant d’unités du catalogue. Ces jours sont simulés, pas les réserves réelles de la photo. La date de ravitaillement est aussi une hypothèse.',
            )}
          </p>
          <details className="pantry-details">
            <summary>{t('Autonomy by nutrient', 'Autonomie par nutriment')}</summary>
            <div>
              {' '}
              <div className="pantry-macros">
                {(
                  [
                    ['Protein', 'Protéines', pantry.macro_autonomy_days.protein],
                    ['Carbs', 'Glucides', pantry.macro_autonomy_days.carbs],
                    ['Fat', 'Lipides', pantry.macro_autonomy_days.fat],
                  ] as const
                ).map(([en, fr, days]) => (
                  <div key={en}>
                    <span>{t(en, fr)}</span>
                    <strong>
                      {Math.floor(days)} <small>{t('days', 'jours')}</small>
                    </strong>
                  </div>
                ))}
              </div>
              <p className="pantry-note">
                {t(
                  'Each figure is a separate estimate; these days do not add up.',
                  'Chaque durée est une estimation distincte ; elles ne s’additionnent pas.',
                )}
              </p>
            </div>
          </details>
          <details className="pantry-details">
            <summary>
              {t('Where does this estimate come from?', 'Sur quoi repose cette estimation ?')}
            </summary>
            <div>
              <p>
                <strong>
                  {pantry.counted_package_kcal == null
                    ? '–'
                    : pantry.counted_package_kcal.toLocaleString(dateLocale())}{' '}
                  kcal
                </strong>{' '}
                {t(
                  'in the remaining packages, after logged meals.',
                  'pour les emballages restants, après les repas enregistrés.',
                )}
              </p>
              <p>
                {t('Projection multiplier:', 'Multiplicateur de projection :')}{' '}
                <strong>×{pantry.units_per_lot}</strong>
                {pantry.pending_meals > 0 &&
                  t(
                    ' · then deduct recorded meal energy',
                    ' · puis retrait de l’énergie des repas enregistrés',
                  )}
              </p>
              <p>
                {Math.round(pantry.stock_kcal).toLocaleString(dateLocale())} kcal{' '}
                {t('in the simulation ÷', 'dans la simulation ÷')}{' '}
                {Math.round(pantry.daily_need_kcal).toLocaleString(dateLocale())} kcal/
                {t('day for the crew', 'jour pour l’équipage')}.
              </p>
              <p>
                {t(
                  'Counts from the photo or manual checks × the food catalogue. The model counts boxes; it does not measure their nutrients.',
                  'Comptage sur photo ou vérification manuelle × catalogue alimentaire. Le modèle compte les boîtes ; il ne mesure pas leurs nutriments.',
                )}
              </p>
              <p>
                {t('Demo scale:', 'Échelle de démo :')} {pantry.units_per_lot}{' '}
                {t(
                  'catalogue units per counted box. Energy needs use Mifflin–St Jeor × activity, a terrestrial estimate.',
                  'unités du catalogue par boîte comptée. Les besoins utilisent Mifflin–St Jeor × activité, une estimation terrestre.',
                )}
              </p>
              <p>
                {t(
                  'An unflagged AI count is still unverified. Correct the inventory before using the estimate.',
                  'Un compte IA sans alerte reste non vérifié. Corrigez le stock avant de vous appuyer sur l’estimation.',
                )}
              </p>
            </div>
          </details>
          {pantry.expiry_warning && (
            <p className="pantry-warning">
              {t('An item expires in', 'Un aliment expire dans')} {pantry.min_expiry_days}{' '}
              {t('days', 'jours')}.
            </p>
          )}
          {pantry.pending_meals > 0 && (
            <p className="pantry-note">
              {pantry.pending_meals}{' '}
              {t('meals recorded since the last scan', 'repas enregistrés depuis le dernier scan')}.
            </p>
          )}
        </>
      ) : (
        <p>{t('Stock estimate unavailable.', 'Estimation du stock indisponible.')}</p>
      )}
    </Panel>
  );
}

export function PantryAutonomy(
  props: Parameters<typeof MissionProjection>[0] & {
    onSettings: () => void;
    onDelay: (context: MissionContext | null) => void;
    onSimulator: () => void;
  },
) {
  const [projection, setProjection] = useState<MissionContext | null>(null);
  const { pantry, onReview } = props;
  const total = pantry?.slots.reduce((sum, s) => sum + (s.count ?? 0), 0);
  const checked = pantry?.slots.filter((s) => s.item && s.source === 'manual').length ?? 0;
  const assigned = pantry?.slots.filter((s) => s.item).length ?? 0;
  return (
    <Panel className="pantry-stock-summary">
      <div className="pantry-mission-shortcuts">
        <div className="pantry-mission-meta">
          <p className="pantry-note">
            {t(
              `Active mission · demo scale ×${pantry?.units_per_lot ?? '…'}`,
              `Mission active · échelle de démo ×${pantry?.units_per_lot ?? '…'}`,
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={props.onSettings}>
            {t('Change mission', 'Changer de mission')}
          </Button>
        </div>
        <div className="pantry-mission-buttons">
          {props.context && (
            <Button onClick={() => setProjection(props.context)}>
              <MissionIllustration context={props.context.type} size={24} />
              <span>
                {t('Simulate', 'Simuler')} · {t(props.context.label)}
              </span>
            </Button>
          )}
          <Button icon={<IconCargo size={18} />} onClick={props.onSimulator}>
            <span>{t('Management simulator', 'Simulateur de gestion')}</span>
          </Button>
        </div>
      </div>
      <div className="pantry-stage-heading">
        <IconCheck size={22} />
        <div>
          <h2>{t('Recorded inventory', 'Stock enregistré')}</h2>
          <p>
            {t(
              'Packages counted, before any mission projection.',
              'Les emballages comptés, avant toute projection de mission.',
            )}
          </p>
        </div>
      </div>
      <div className="pantry-days">
        <strong>{total ?? '–'}</strong>
        <span>{t('packages recorded', 'emballages enregistrés')}</span>
      </div>
      {pantry && (
        <p className="pantry-package-energy">
          <strong>
            {pantry.counted_package_kcal == null
              ? '–'
              : pantry.counted_package_kcal.toLocaleString(dateLocale())}{' '}
            kcal
          </strong>{' '}
          {t('for these packages', 'pour ces emballages')}
          <small>
            {t(
              'Catalogue values · before demo scaling and meals recorded after the photo. Unknown counts are excluded.',
              'Valeurs du catalogue · avant projection de démo et repas enregistrés après la photo. Les quantités inconnues sont exclues.',
            )}
          </small>
        </p>
      )}
      <p className="pantry-note">
        {checked}/{assigned}{' '}
        {t('assigned slots checked by a person', 'cases attribuées vérifiées par une personne')}
      </p>
      {total === 0 && (
        <p className="pantry-note">
          {t(
            'No packages counted. Take a photo to fill the stock.',
            'Aucun emballage compté. Prenez une photo pour remplir le stock.',
          )}
        </p>
      )}
      <div className="pantry-stock-mini">
        {(pantry?.slots ?? [])
          .filter((s) => s.item && s.count !== 0)
          .map((s) => (
            <div key={s.slot}>
              <FoodIcon name={s.item!} />
              <span>
                {t(s.item!)} <small className="pantry-note">{s.slot}</small>
              </span>
              <strong>{s.count ?? '–'}</strong>
            </div>
          ))}
      </div>
      <Button onClick={onReview}>
        {t('Review or correct quantities', 'Vérifier ou corriger les quantités')}
      </Button>
      {projection && (
        <DetailSheet
          title={t('Mission reserves', 'Réserves de la mission')}
          onClose={() => setProjection(null)}
        >
          <MissionHeading context={projection} />
          <MissionProjection
            {...props}
            context={projection}
            onReview={() => {
              setProjection(null);
              props.onReview();
            }}
          />
          <Button
            onClick={() => {
              props.onDelay(projection);
              setProjection(null);
            }}
          >
            {t('Simulate a supply delay', 'Simuler un retard de ravitaillement')}
          </Button>
          <details className="pantry-details">
            <summary>{t('Mission objective & constraints', 'Objectif et contraintes de la mission')}</summary>
            <div>
              <MissionBrief context={projection} />
            </div>
          </details>
        </DetailSheet>
      )}
    </Panel>
  );
}

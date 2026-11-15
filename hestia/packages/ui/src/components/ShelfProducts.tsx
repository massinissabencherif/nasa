import { useEffect, useState } from 'react';
import type { ApiClient, FoodItem, PantrySlot } from '@hestia/api-client';
import { Button } from './Button';
import { FoodIcon } from './FoodIcon';
import { LoadingState } from './LoadingState';
import { DetailSheet } from './DetailSheet';
import { ShelfProductForm } from './ShelfProductForm';
import { t } from '../i18n';
import { IconAlert } from '../icons';

/** Shelf labels are configured by the person; the model only proposes counts. */
export function ShelfProducts({
  api,
  slots,
  onChanged,
}: {
  api: ApiClient;
  slots: PantrySlot[];
  onChanged: (slots: PantrySlot[]) => void;
}) {
  const [items, setItems] = useState<FoodItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | 'new' | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [view, setView] = useState<'slots' | 'catalogue'>('slots');
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    api
      .listFoodItems()
      .then((data) => {
        if (current) setItems(data);
      })
      .catch(() => {
        if (current) setError(t('Could not load the catalogue.', 'Impossible de charger le catalogue.'));
      });
    return () => {
      current = false;
    };
  }, [api]);
  const assignments = new Map<number, string[]>();
  for (const slot of slots) {
    if (slot.food_item_id != null) {
      assignments.set(slot.food_item_id, [...(assignments.get(slot.food_item_id) ?? []), slot.slot]);
    }
  }
  const unused = items?.filter((item) => !assignments.has(item.id));
  const repeated = items?.filter((item) => (assignments.get(item.id)?.length ?? 0) > 1);
  const selectedFood = slots.find((slot) => slot.slot === selected)?.food_item_id;
  async function assign(foodId: number) {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateGridSlot(selected, { food_item_id: foodId });
      const pantry = await api.getPantry();
      onChanged(pantry.slots);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hz-shelf-products">
      <nav
        className="hz-shelf-actions"
        aria-label={t('Products and assignments', 'Produits et attributions')}
      >
        <Button active={view === 'slots'} aria-pressed={view === 'slots'} onClick={() => setView('slots')}>
          {t('Slot assignments', 'Attributions')}
        </Button>
        <Button
          active={view === 'catalogue'}
          aria-pressed={view === 'catalogue'}
          onClick={() => setView('catalogue')}
        >
          {t('Products & values', 'Produits et valeurs')}
        </Button>
      </nav>
      {view === 'slots' && (
        <>
          <p>
            {t(
              'Tell HESTIA which product is in each slot. These assignments are saved on the station; recount affected slots afterwards.',
              'Indiquez quel produit se trouve dans chaque case. Ces affectations sont enregistrées sur la station ; recomptez ensuite les cases modifiées.',
            )}
          </p>
          {unused && (
            <p className="hz-shelf-usage-summary">
              <strong>{t('Not assigned:', 'Non attribués :')}</strong>{' '}
              {unused.length ? unused.map((item) => t(item.name)).join(' · ') : t('None', 'Aucun')}
            </p>
          )}
          {!!repeated?.length && (
            <div className="hz-shelf-assignment-note">
              <IconAlert size={18} aria-hidden="true" />
              <div>
                <strong>{t('Products in several slots', 'Produits dans plusieurs cases')}</strong>
                <p>
                  {repeated
                    .map((item) => `${t(item.name)} (${assignments.get(item.id)!.join(', ')})`)
                    .join(' · ')}
                </p>
                <p>
                  {t(
                    'Allowed when these are separate packages. If you moved the same packages, recount the old slots too.',
                    'C’est possible si les emballages sont distincts. Si vous avez déplacé les mêmes produits, recomptez aussi les anciennes cases.',
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="hz-shelf-product-grid">
            {slots.map((slot) => (
              <Button
                key={slot.slot}
                active={selected === slot.slot}
                aria-pressed={selected === slot.slot}
                disabled={busy}
                onClick={() => setSelected(slot.slot)}
              >
                <span>
                  <strong>{slot.slot}</strong>
                  <span>{slot.item ? t(slot.item) : t('Empty slot', 'Case vide')}</span>
                </span>
              </Button>
            ))}
          </div>
          {selected && (
            <section>
              <h3>{t(`Product in ${selected}`, `Produit dans ${selected}`)}</h3>
              {!items && !error && (
                <LoadingState label={t('Loading catalogue…', 'Chargement du catalogue…')} />
              )}
              <div className="hz-shelf-product-grid">
                <Button
                  disabled={busy}
                  active={selectedFood == null}
                  aria-pressed={selectedFood == null}
                  onClick={() => void assign(0)}
                >
                  {t('Keep this slot empty', 'Laisser cette case vide')}
                </Button>
                {(items ?? []).map((item) => (
                  <Button
                    key={item.id}
                    disabled={busy}
                    active={selectedFood === item.id}
                    aria-pressed={selectedFood === item.id}
                    onClick={() => void assign(item.id)}
                  >
                    <FoodIcon name={item.name} />
                    <span>
                      {t(item.name)}
                      <span>
                        {assignments.has(item.id)
                          ? t(
                              `In ${assignments.get(item.id)!.join(', ')}`,
                              `Dans ${assignments.get(item.id)!.join(', ')}`,
                            )
                          : t('Not assigned', 'Non attribué')}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {view === 'catalogue' && (
        <div className="hz-shelf-catalogue">
          <p className="hz-caption">
            {t(
              'Values per whole package. Demo estimates can be replaced with your label values.',
              'Valeurs pour un emballage entier. Remplacez les estimations de démo par les valeurs de vos étiquettes.',
            )}
          </p>
          {!items && !error && <LoadingState label={t('Loading catalogue…', 'Chargement du catalogue…')} />}
          {(items ?? []).map((item) => (
            <div className="hz-shelf-catalogue-row" key={item.id}>
              <FoodIcon name={item.name} />
              <div>
                <strong>{t(item.name)}</strong>
                <small>
                  {item.kcal} kcal · {t('Protein', 'Protéines')} {item.protein_g} g · {t('Carbs', 'Glucides')}{' '}
                  {item.carbs_g} g · {t('Fat', 'Lipides')} {item.fat_g} g
                </small>
              </div>
              <Button
                size="sm"
                aria-label={t(`Edit ${t(item.name)}`, `Modifier ${t(item.name)}`)}
                onClick={() => setEditing(item)}
              >
                {t('Edit', 'Modifier')}
              </Button>
            </div>
          ))}
        </div>
      )}
      {busy && <p role="status">{t('Saving assignment…', 'Enregistrement de l’affectation…')}</p>}
      {error && <p role="alert">{error}</p>}
      <Button disabled={busy} onClick={() => setEditing('new')}>
        {t('Add a product', 'Ajouter un produit')}
      </Button>
      {editing && (
        <DetailSheet
          variant="modal"
          title={
            editing === 'new'
              ? t('Add a product', 'Ajouter un produit')
              : t(`Edit ${t(editing.name)}`, `Modifier ${t(editing.name)}`)
          }
          dismissible={!formBusy}
          onClose={() => setEditing(null)}
        >
          <ShelfProductForm
            api={api}
            food={editing === 'new' ? undefined : editing}
            onBusyChange={setFormBusy}
            onCancel={() => setEditing(null)}
            onSaved={(food) => {
              const added = editing === 'new';
              setItems((prev) =>
                added
                  ? [...(prev ?? []), food]
                  : (prev ?? []).map((item) => (item.id === food.id ? food : item)),
              );
              setEditing(null);
              setCreated(
                added
                  ? t(
                      `${food.name} added. Choose a slot to assign it.`,
                      `${food.name} ajouté. Choisissez une case pour l’y attribuer.`,
                    )
                  : t(
                      'Product updated. Counts are unchanged.',
                      'Produit modifié. Les quantités sont conservées.',
                    ),
              );
              void api
                .getPantry()
                .then((pantry) => onChanged(pantry.slots))
                .catch(() =>
                  setError(
                    t(
                      'Saved, but the stock could not be refreshed. Reopen this panel.',
                      'Enregistré, mais le stock n’a pas pu être actualisé. Rouvrez cette fiche.',
                    ),
                  ),
                );
            }}
          />
        </DetailSheet>
      )}
      {created && <p role="status">{created}</p>}
      <p className="hz-caption">
        {t(
          'Product names are assigned by you, not recognised by the model.',
          'Les noms des produits sont attribués par vous, pas reconnus par le modèle.',
        )}
      </p>
    </div>
  );
}

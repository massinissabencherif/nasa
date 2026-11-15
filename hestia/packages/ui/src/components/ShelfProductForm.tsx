import { useState, type FormEvent } from 'react';
import type { ApiClient, FoodItem } from '@hestia/api-client';
import { Button } from './Button';
import { Input } from './Input';
import { t } from '../i18n';

export function ShelfProductForm({
  api,
  food,
  onSaved,
  onBusyChange,
  onCancel,
}: {
  api: ApiClient;
  food?: FoodItem;
  onSaved: (food: FoodItem) => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(food?.name ?? '');
  const [values, setValues] = useState({
    kcal: food ? String(food.kcal) : '',
    protein_g: food ? String(food.protein_g) : '',
    carbs_g: food ? String(food.carbs_g) : '',
    fat_g: food ? String(food.fat_g) : '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      busy ||
      name.trim().length < 2 ||
      Object.values(values).some((v) => v.trim() === '' || !Number.isFinite(Number(v)) || Number(v) < 0)
    )
      return;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const valuesToSave = {
        name: name.trim(),
        kcal: Number(values.kcal),
        protein_g: Number(values.protein_g),
        carbs_g: Number(values.carbs_g),
        fat_g: Number(values.fat_g),
      };
      const saved = food
        ? await api.updateFoodItem(food.id, valuesToSave)
        : await api.addFoodItem(valuesToSave);
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : String(cause));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form className="hz-shelf-product-form" onSubmit={(e) => void submit(e)}>
      <p className="hz-caption">
        {t(
          'Enter the label values for one whole package, not per 100 g. These values are declared by you; the mission multiplier remains a demo assumption.',
          'Saisissez les valeurs de l’étiquette pour un emballage entier, pas pour 100 g. Ces valeurs sont déclarées par vous ; le multiplicateur de mission reste une hypothèse de démo.',
        )}
      </p>
      {food && (
        <p className="hz-shelf-assignment-note">
          {t(
            'Saving updates this product everywhere, including calorie calculations for previously recorded meals. Package counts stay unchanged.',
            'La modification s’applique partout, y compris aux calories des repas déjà enregistrés avec ce produit. Les quantités restent inchangées.',
          )}
        </p>
      )}
      <label>
        {t('Product name', 'Nom du produit')}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={40}
          disabled={busy}
        />
      </label>
      <div className="hz-shelf-product-grid">
        {(
          [
            ['kcal', t('Energy (kcal)', 'Énergie (kcal)'), 20000],
            ['protein_g', t('Protein (g)', 'Protéines (g)'), 2000],
            ['carbs_g', t('Carbohydrates (g)', 'Glucides (g)'), 5000],
            ['fat_g', t('Fat (g)', 'Lipides (g)'), 2000],
          ] as const
        ).map(([key, label, max]) => (
          <label key={key}>
            {label}
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={max}
              step="any"
              required
              disabled={busy}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="hz-shelf-actions">
        <Button type="submit" variant="primary" loading={busy}>
          {food
            ? t('Save changes', 'Enregistrer les modifications')
            : t('Add to catalogue', 'Ajouter au catalogue')}
        </Button>
        <Button onClick={onCancel} disabled={busy}>
          {t('Cancel', 'Annuler')}
        </Button>
      </div>
    </form>
  );
}

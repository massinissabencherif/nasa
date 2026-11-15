import { useState } from 'react';
import type { ApiClient, PantrySlot, ScanResponse } from '@hestia/api-client';
import { Button } from './Button';
import { Input } from './Input';
import { ShelfPhotoViewport } from './ShelfPhotoViewport';
import { t } from '../i18n';

export function ShelfScanReview({
  result,
  slots,
  api,
  onSaved,
  onDiscard,
}: {
  result: ScanResponse;
  slots: PantrySlot[];
  api: ApiClient;
  onSaved: () => void;
  onDiscard: () => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((result.slots ?? []).map((s) => [s.slot, String(s.count)])),
  );
  const [replaceStock, setReplaceStock] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = result.proposal_id;
  if (!id) return null;
  const photographedSlots = slots.filter((slot) => Object.prototype.hasOwnProperty.call(counts, slot.slot));
  const valid =
    photographedSlots.length > 0 &&
    photographedSlots.every((slot) => {
      const raw = counts[slot.slot];
      return (
        raw != null &&
        /^\d+$/.test(raw) &&
        Number(raw) <= slot.capacity &&
        (slot.food_item_id != null || Number(raw) === 0)
      );
    });
  async function save() {
    if (!id || busy || !valid || !checked) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveScanReview(
        id,
        Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
        replaceStock,
      );
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hz-shelf-review">
      <p>
        <strong>{t('Stock is unchanged.', 'Le stock n’a pas changé.')}</strong>{' '}
        {t(
          'Compare every count with the picture, then save. The model can invent objects.',
          'Comparez chaque quantité à la photo, puis enregistrez. Le modèle peut inventer des objets.',
        )}
      </p>
      {result.mode === 'mock' && (
        <p className="hz-caption">
          {t('Demo replay: known counts, no AI.', 'Rejeu de démo : quantités connues, sans IA.')}
        </p>
      )}
      <ShelfPhotoViewport
        imageUrl={api.reviewImageUrl(id)}
        boxes={result.boxes ?? {}}
        alt={t('Analysed crop', 'Cadrage analysé')}
      >
        {(localBoxes) =>
          Object.entries(localBoxes).map(([label, b]) => (
            <span
              key={label}
              className="hz-shelf-review-box"
              style={{
                left: `${b[0] * 100}%`,
                top: `${b[1] * 100}%`,
                width: `${(b[2] - b[0]) * 100}%`,
                height: `${(b[3] - b[1]) * 100}%`,
              }}
            >
              <span>{label}</span>
            </span>
          ))
        }
      </ShelfPhotoViewport>
      {(result.warnings ?? []).map((warning) => (
        <p key={warning} className="hz-shelf-warning">
          {t(warning)}
        </p>
      ))}
      {photographedSlots.length < slots.length && (
        <fieldset className="hz-shelf-stock-scope">
          <legend>{t('What does this crop contain?', 'Que contient ce cadrage ?')}</legend>
          <label>
            <input
              type="radio"
              name="stock-scope"
              checked={!replaceStock}
              onChange={() => {
                setReplaceStock(false);
                setChecked(false);
              }}
            />
            {t('Part of the existing stock', 'Une partie du stock existant')}
          </label>
          <label>
            <input
              type="radio"
              name="stock-scope"
              checked={replaceStock}
              onChange={() => {
                setReplaceStock(true);
                setChecked(false);
              }}
            />
            {t('My whole new reserve', 'Toute ma nouvelle réserve')}
          </label>
          <p className={replaceStock ? 'hz-shelf-warning' : 'hz-caption'}>
            {replaceStock
              ? t(
                  'Saving will set every slot outside this crop to zero. Use this when replacing the old demo layout.',
                  'À l’enregistrement, toutes les cases hors de ce cadrage passeront à zéro. À choisir pour remplacer l’ancienne disposition de démo.',
                )
              : t(
                  'Other slot quantities are kept. If you moved the same products into new slots, choose the whole-reserve option to avoid counting them twice.',
                  'Les autres quantités sont conservées. Si vous avez déplacé les mêmes produits vers de nouvelles cases, choisissez la réserve entière pour éviter de les compter deux fois.',
                )}
          </p>
        </fieldset>
      )}
      <div className="hz-shelf-review-counts">
        {photographedSlots.map((slot) => (
          <label key={slot.slot}>
            <span>
              <strong>{slot.slot}</strong> · {t(slot.item ?? 'Empty slot')}
            </span>
            <Input
              type="number"
              min={0}
              max={slot.food_item_id == null ? 0 : slot.capacity}
              inputMode="numeric"
              aria-label={`${slot.slot} ${t('count', 'quantité')}`}
              value={counts[slot.slot] ?? ''}
              disabled={busy}
              onChange={(e) => {
                setCounts({ ...counts, [slot.slot]: e.target.value });
                setChecked(false);
              }}
            />
          </label>
        ))}
      </div>
      {!valid && (
        <p role="status">
          {t(
            'Enter a valid quantity for every slot. Unassigned slots must stay empty.',
            'Renseignez chaque quantité. Une case sans aliment attribué doit rester vide.',
          )}
        </p>
      )}
      <label className="hz-shelf-ack">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(e) => setChecked(e.target.checked)}
        />
        {t('I checked all quantities against the photo.', 'J’ai vérifié toutes les quantités sur la photo.')}
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="hz-shelf-actions">
        <Button variant="primary" disabled={!valid || !checked} loading={busy} onClick={() => void save()}>
          {t('Save verified inventory', 'Enregistrer le stock vérifié')}
        </Button>
        <Button disabled={busy} onClick={onDiscard}>
          {t('Discard this reading', 'Abandonner cette lecture')}
        </Button>
      </div>
    </div>
  );
}

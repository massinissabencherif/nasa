import { useState } from 'react';
import type { ApiClient, PantrySlot, ScanResponse, StockReviewMode } from '@hestia/api-client';
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
  onSaved: (mode: StockReviewMode) => void;
  onDiscard: () => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((result.slots ?? []).map((s) => [s.slot, String(s.count)])),
  );
  const [mode, setMode] = useState<StockReviewMode | null>(null);
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
    if (!id || busy || !valid || !checked || !mode) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveScanReview(
        id,
        Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
        mode,
      );
      onSaved(mode);
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
      <fieldset className="hz-shelf-stock-scope">
        <legend>{t('What should happen to the stock?', 'Que faire de ces produits ?')}</legend>
        {(
          [
            ['add', t('Add these products', 'Ajouter ces produits')],
            ['replace', t('This is my whole stock', 'C’est tout mon stock')],
            ['recount', t('Recount only these slots', 'Recompter seulement ces cases')],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="stock-scope"
              checked={mode === value}
              disabled={busy}
              onChange={() => {
                setMode(value);
                setChecked(false);
              }}
            />
            {label}
          </label>
        ))}
        {mode && (
          <p className={mode === 'replace' ? 'hz-shelf-warning' : 'hz-caption'}>
            {mode === 'add'
              ? t(
                  'Only new packages: these quantities are added to the stock already recorded. Do not scan the same packages twice.',
                  'Uniquement de nouveaux emballages : ces quantités s’ajoutent au stock enregistré. Ne comptez pas les mêmes produits deux fois.',
                )
              : mode === 'replace'
                ? t(
                    `This photo replaces the whole reserve. ${slots.filter((s) => !Object.prototype.hasOwnProperty.call(counts, s.slot)).reduce((sum, s) => sum + (s.count ?? 0), 0)} packages outside this photo will be removed from the recorded stock.`,
                    `Cette photo remplace toute la réserve. ${slots.filter((s) => !Object.prototype.hasOwnProperty.call(counts, s.slot)).reduce((sum, s) => sum + (s.count ?? 0), 0)} emballages hors photo seront retirés du stock enregistré.`,
                  )
                : t(
                    'The photographed slot quantities are updated; other stock is kept.',
                    'Les quantités de ces cases sont mises à jour ; le reste du stock est conservé.',
                  )}
          </p>
        )}
      </fieldset>
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
      <div className="hz-shelf-review-counts">
        {photographedSlots.map((slot) => (
          <label key={slot.slot}>
            <span>
              <strong>{slot.slot}</strong> · {t(slot.item ?? 'Empty slot')}
              {mode && (
                <small className="hz-caption">
                  {t('Stock', 'Stock')} : {slot.count ?? '—'} →{' '}
                  {mode === 'add'
                    ? slot.count == null
                      ? '—'
                      : slot.count + Number(counts[slot.slot] || 0)
                    : Number(counts[slot.slot] || 0)}
                </small>
              )}
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
        {mode === 'add'
          ? t(
              'These are new packages, not already included in stock. I checked their quantities.',
              'Ces produits ne sont pas déjà comptés dans le stock. J’ai vérifié leurs quantités.',
            )
          : mode === 'replace'
            ? t(
                'This is my whole remaining stock. I confirm replacing the old quantities.',
                'C’est tout le stock qu’il me reste. Je confirme le remplacement des anciennes quantités.',
              )
            : t(
                'I checked all quantities against the photo.',
                'J’ai vérifié toutes les quantités sur la photo.',
              )}
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="hz-shelf-actions">
        <Button
          variant="primary"
          disabled={!valid || !checked || !mode}
          loading={busy}
          onClick={() => void save()}
        >
          {mode === 'add'
            ? t('Add to stock', 'Ajouter au stock')
            : mode === 'replace'
              ? t('Replace stock', 'Remplacer le stock')
              : t('Save verified inventory', 'Enregistrer le stock vérifié')}
        </Button>
        <Button disabled={busy} onClick={onDiscard}>
          {t('Discard this reading', 'Abandonner cette lecture')}
        </Button>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import type { PantryState } from '@hestia/api-client';
import { Button, DetailSheet, Input, t } from '@hestia/ui';
import { api } from '../../lib/api';

export function StockScale({ pantry, onChanged }: { pantry: PantryState; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const valid = /^\d+$/.test(draft) && Number(draft) >= 1 && Number(draft) <= 10000;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.setStockScale(Number(draft));
      onChanged();
      setOpen(false);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-scale">
      <div>
        <strong>
          {t('Mission multiplier', 'Multiplicateur de mission')} · ×{pantry.units_per_lot}
        </strong>
        <p className="hz-caption">
          {t(
            '×1 uses package values. Higher values simulate a larger reserve.',
            '×1 utilise les valeurs des emballages. Au-delà, on simule une réserve plus grande.',
          )}
        </p>
      </div>
      <Button
        onClick={() => {
          setDraft(String(pantry.units_per_lot));
          setError(null);
          setOpen(true);
        }}
      >
        {t('Adjust multiplier', 'Régler le multiplicateur')}
      </Button>
      {saved && (
        <p role="status" className="hz-caption">
          {t(
            'Multiplier saved. Package counts are unchanged.',
            'Multiplicateur enregistré. Les quantités d’emballages sont conservées.',
          )}
        </p>
      )}
      {open && (
        <DetailSheet
          variant="modal"
          title={t('Mission multiplier', 'Multiplicateur de mission')}
          dismissible={!busy}
          onClose={() => setOpen(false)}
        >
          <form className="hz-shelf-product-form" onSubmit={(e) => void save(e)}>
            <p>
              {t(
                'Choose how many packages one counted package represents in the simulation.',
                'Choisissez combien d’emballages représente un emballage compté dans la simulation.',
              )}
            </p>
            <div className="hz-shelf-actions">
              <Button active={draft === '1'} disabled={busy} onClick={() => setDraft('1')}>
                {t('×1 · My tray', '×1 · Mon bac')}
              </Button>
              <Button
                active={draft === String(pantry.default_units_per_lot)}
                disabled={busy}
                onClick={() => setDraft(String(pantry.default_units_per_lot))}
              >
                {t(`×${pantry.default_units_per_lot} · Demo`, `×${pantry.default_units_per_lot} · Démo`)}
              </Button>
            </div>
            <label>
              {t('Multiplier', 'Multiplicateur')}
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                step={1}
                value={draft}
                required
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <p className="hz-caption">
              {t(
                'Affects projections and available demo meal portions for every product. Counts and recorded meals stay unchanged. Resetting the demo restores its original multiplier.',
                'Modifie les projections et les portions disponibles pour les repas de démo, pour tous les produits. Les quantités et les repas enregistrés sont conservés. Réinitialiser la démo rétablit son multiplicateur initial.',
              )}
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="hz-shelf-actions">
              <Button type="submit" variant="primary" disabled={!valid} loading={busy}>
                {t('Save multiplier', 'Enregistrer le multiplicateur')}
              </Button>
              <Button disabled={busy} onClick={() => setOpen(false)}>
                {t('Cancel', 'Annuler')}
              </Button>
            </div>
          </form>
        </DetailSheet>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { ApiClient, PantrySlot } from '@hestia/api-client';
import { Button } from './Button';
import { DetailSheet } from './DetailSheet';
import { ShelfProducts } from './ShelfProducts';
import { IconPantry } from '../icons';
import { t } from '../i18n';

export function ShelfSetup({
  api,
  slots,
  onChanged,
}: {
  api: ApiClient;
  slots: PantrySlot[];
  onChanged: () => void;
}) {
  const [view, setView] = useState<'products' | 'empty' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState(false);
  async function empty() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.emptyStock();
      onChanged();
      setView(null);
      setReceipt(true);
    } catch (cause) {
      setError(cause instanceof Error ? t(cause.message) : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="hz-shelf-actions">
        <Button
          icon={<IconPantry size={18} />}
          onClick={() => {
            setError(null);
            setView('products');
          }}
        >
          {t('Prepare my products', 'Préparer mes produits')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setError(null);
            setView('empty');
          }}
        >
          {t('Start with empty stock…', 'Partir d’un stock vide…')}
        </Button>
      </div>
      {receipt && (
        <p role="status" className="hz-caption">
          {t(
            'All quantities are now zero. Catalogue and health records are unchanged.',
            'Toutes les quantités sont à zéro. Le catalogue et les bilans sont conservés.',
          )}
        </p>
      )}
      {view && (
        <DetailSheet
          title={
            view === 'products'
              ? t('Prepare my products', 'Préparer mes produits')
              : t('Empty the current stock?', 'Vider le stock actuel ?')
          }
          onClose={() => {
            if (!busy) setView(null);
          }}
        >
          {view === 'products' ? (
            <ShelfProducts api={api} slots={slots} onChanged={onChanged} />
          ) : (
            <div className="hz-shelf-flow">
              <p>
                {t(
                  'Every slot quantity will become zero, including manually checked stock. The current photo will be removed from the overview.',
                  'Toutes les quantités passeront à zéro, y compris celles déjà vérifiées. La photo actuelle disparaîtra de l’aperçu.',
                )}
              </p>
              <p className="hz-caption">
                {t(
                  'Products, assignments, crew, health records and historical records are kept. This does not record a meal or reset the mission.',
                  'Produits, attributions, équipage, bilans et historique sont conservés. Cela n’enregistre aucun repas et ne réinitialise pas la mission.',
                )}
              </p>
              {error && <p role="alert">{error}</p>}
              <Button variant="danger" loading={busy} onClick={() => void empty()}>
                {t('Confirm empty stock', 'Confirmer le stock vide')}
              </Button>
              <Button disabled={busy} onClick={() => setView(null)}>
                {t('Cancel', 'Annuler')}
              </Button>
            </div>
          )}
        </DetailSheet>
      )}
    </>
  );
}

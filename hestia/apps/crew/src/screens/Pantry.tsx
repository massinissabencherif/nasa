import { useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { ConsumptionEvent, PantrySlot, PantryState } from '@hestia/api-client';
import {
  Button,
  DetailSheet,
  FoodIcon,
  Input,
  LoadError,
  LoadingState,
  Panel,
  ShelfCapture,
  dateLocale,
  parseServerTime,
  t,
} from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';

export function Pantry() {
  // `#/pantry?photo=1`: the station's code opens the photo sheet at once
  const openPhoto = new URLSearchParams(useLocation().search).get('photo') === '1';
  const api = useApi();
  const [pantry, setPantry] = useState<PantryState | null>(null);
  const [feed, setFeed] = useState<ConsumptionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [editing, setEditing] = useState<PantrySlot | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    api
      .getPantry()
      .then((p) => {
        setPantry(p);
        setError(null);
      })
      .catch(() => setError(t('Stock could not be refreshed.', 'Le stock n’a pas pu être actualisé.')));
    api
      .getConsumption()
      .then(setFeed)
      .catch(() => {});
  }, [api]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function confirm() {
    if (!editing || busy || !/^\d+$/.test(draft) || Number(draft) > 99) return;
    setBusy(true);
    setSaveError(null);
    try {
      await api.confirmSlot(editing.slot, Number(draft));
      setReceipt(t('Quantity saved.', 'Quantité enregistrée.'));
      setEditing(null);
      refresh();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hz-crew-pantry">
      <header>
        <h1>{t('Pantry', 'Réserve')}</h1>
        <p>
          {t(
            'Photograph, check, then save the packages left on the shelf.',
            'Photographiez, vérifiez, puis enregistrez les emballages restants.',
          )}
        </p>
      </header>
      {error && <LoadError label={error} onRetry={refresh} />}
      {!pantry && !error && <LoadingState label={t('Loading inventory…', 'Chargement du stock…')} />}
      {pantry && (
        <>
          <ShelfCapture
            api={api}
            startOpen={openPhoto}
            slots={pantry.slots}
            boxes={pantry.boxes ?? {}}
            onSaved={(mode) => {
              refresh();
              setReceipt(
                mode === 'add'
                  ? t('Products added to stock.', 'Produits ajoutés au stock.')
                  : mode === 'replace'
                    ? t('Whole stock replaced.', 'Stock entièrement remplacé.')
                    : t('Stock counts updated.', 'Quantités du stock mises à jour.'),
              );
            }}
          />
          {receipt && (
            <p role="status" className="hz-feedback-arrive">
              {receipt}
            </p>
          )}
          <Panel title={t('Recorded packages', 'Emballages enregistrés')}>
            <p>
              <strong>{pantry.slots.reduce((sum, s) => sum + (s.count ?? 0), 0)}</strong>{' '}
              {t(
                'packages remaining after logged meals',
                'emballages restants après les consommations enregistrées',
              )}
            </p>
            <p>
              <strong>
                {pantry.counted_package_kcal == null
                  ? '–'
                  : pantry.counted_package_kcal.toLocaleString(dateLocale())}{' '}
                kcal
              </strong>{' '}
              {t(
                'according to the catalogue, after logged meals and before mission scaling. Unknown counts are excluded.',
                'selon le catalogue, après les repas et avant projection. Les quantités inconnues sont exclues.',
              )}
            </p>
            <p className="hz-caption">
              {t(
                `Mission projections use a ×${pantry.units_per_lot} demo scale; these packages are not months of actual food.`,
                `Les projections de mission utilisent une échelle de démo ×${pantry.units_per_lot} ; ces emballages ne représentent pas des mois de nourriture réelle.`,
              )}
            </p>
          </Panel>
          <div className="hz-crew-pantry-slots">
            {pantry.slots
              .filter((s) => s.item != null)
              .map((slot) => (
                <Panel key={slot.slot}>
                  <div className="hz-crew-pantry-food">
                    <FoodIcon name={slot.item!} />
                    <div>
                      <h2>{t(slot.item!)}</h2>
                      <p className="hz-caption">
                        {slot.slot} ·{' '}
                        {slot.source === 'manual'
                          ? t('Human checked', 'Vérifié par une personne')
                          : t('Not human checked', 'Non vérifié par une personne')}
                      </p>
                    </div>
                  </div>
                  <div className="hz-shelf-actions">
                    <strong>
                      {slot.count ?? '–'}{' '}
                      {slot.count === 1 ? t('package', 'emballage') : t('packages', 'emballages')}
                    </strong>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(slot);
                        setDraft(String(slot.count ?? 0));
                        setSaveError(null);
                      }}
                    >
                      {t('Correct', 'Corriger')}
                    </Button>
                  </div>
                </Panel>
              ))}
          </div>
          {feed.length > 0 && (
            <Panel title={t('Latest movements', 'Derniers mouvements')}>
              <ul className="hz-crew-pantry-feed">
                {feed.slice(0, 4).map((event) => (
                  <li key={event.id}>
                    <span>
                      <strong>
                        {event.qty > 0 ? '+' : '−'}
                        {Math.abs(event.qty)}
                      </strong>{' '}
                      {event.unit === 'portion' ? t('unit(s)', 'unité(s)') : t('package(s)', 'emballage(s)')}{' '}
                      · {t(event.food_name ?? '')}
                      <small>
                        {event.cancelled
                          ? t('Cancelled', 'Annulé')
                          : (event.crew_name ?? t('Inventory correction', 'Correction du stock'))}
                      </small>
                    </span>
                    <time>
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
            </Panel>
          )}
        </>
      )}
      {editing && (
        <DetailSheet title={`${editing.slot} · ${t(editing.item ?? '')}`} onClose={() => setEditing(null)}>
          <label>
            {t('Total packages remaining', 'Total des emballages restants')}
            <Input type="number" min={0} max={99} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          {saveError && <p role="alert">{saveError}</p>}
          <Button
            variant="primary"
            loading={busy}
            disabled={!/^\d+$/.test(draft) || Number(draft) > 99}
            onClick={() => void confirm()}
          >
            {t('Save correction', 'Enregistrer la correction')}
          </Button>
        </DetailSheet>
      )}
    </div>
  );
}

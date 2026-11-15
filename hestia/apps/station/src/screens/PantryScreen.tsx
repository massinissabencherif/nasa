import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEvent, MissionContext, PantrySlot, RationPlan } from '@hestia/api-client';
import {
  Button,
  IconScan,
  IconPantry,
  IconCheck,
  LoadingState,
  LoadError,
  Panel,
  ShelfCapture,
  StatusBadge,
  dateLocale,
  parseServerTime,
  t,
} from '@hestia/ui';
import { api } from '../lib/api';
import { usePantry, useStation } from '../lib/hooks';
import { useSSE } from '../lib/useSSE';
import { PantryPhoto } from '../components/pantry/PantryPhoto';
import { PantrySlotCard } from '../components/pantry/PantrySlotCard';
import { PantryAutonomy } from '../components/pantry/PantryAutonomy';
import { PantryPlanning, PantryMovements } from '../components/pantry/PantryPlanning';
import '../components/pantry/pantry.css';

export function PantryScreen() {
  const navigate = useNavigate();
  const { context } = useStation();
  const { pantry, refresh, error: loadError } = usePantry();
  const [boxes, setBoxes] = useState<Record<string, [number, number, number, number]>>({});
  const [imageUrl, setImageUrl] = useState(() => api.snapshotImageUrl());
  const [scanning, setScanning] = useState(false);
  const [slotsDone, setSlotsDone] = useState<Set<string>>(new Set());
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEvent[]>([]);
  const [rationDays, setRationDays] = useState(30);
  const [plannedMission, setPlannedMission] = useState<MissionContext | null>(null);
  const [planningOpen, setPlanningOpen] = useState(false);
  const stockKcal = pantry?.stock_kcal ?? null;
  const [rationResult, setRationResult] = useState<{
    days: number;
    stockKcal: number | null;
    plan: RationPlan;
  } | null>(null);
  const rationPlan =
    rationResult?.days === rationDays && rationResult.stockKcal === stockKcal ? rationResult.plan : null;
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const inventory = useRef<HTMLElement>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [feedError, setFeedError] = useState(false);

  const refreshFeed = () =>
    api
      .getConsumption()
      .then((data) => {
        setConsumption(data);
        setFeedError(false);
      })
      .catch(() => setFeedError(true));

  useEffect(() => {
    api
      .getGridBoxes()
      .then(setBoxes)
      .catch(() => {});
    refreshFeed();
  }, []);

  useEffect(() => {
    let current = true;
    api
      .getRations(rationDays)
      .then((plan) => {
        if (current) setRationResult({ days: rationDays, stockKcal, plan });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [rationDays, stockKcal]);

  useSSE((event) => {
    if (event.type === 'scan_progress' && Array.isArray(event.labels)) {
      setSlotsDone(new Set(event.labels as string[]));
    }
    if (event.type === 'scan_started') {
      // a scan started elsewhere (a phone sending a photo): show it here too
      setScanning(true);
      setPhotoWarnings([]);
      setReceipt(null);
      setSlotsDone(new Set());
    }
    if (event.type === 'scan_pending') setScanning(false);
    if (event.type === 'scan_failed') {
      setScanning(false);
      setError(
        t(
          'The scan failed. Try again or check the photo.',
          'Le scan a échoué. Réessayez ou vérifiez la photo.',
        ),
      );
    }
    if (event.type === 'grid_changed')
      api
        .getGridBoxes()
        .then(setBoxes)
        .catch(() => {});
    if (
      [
        'scan_complete',
        'slot_confirmed',
        'stock_emptied',
        'catalogue_updated',
        'slot_configuration_changed',
        'meal_logged',
        'reset',
        'reference_photo',
      ].includes(event.type)
    ) {
      if (event.type === 'scan_complete') {
        setScanning(false);
        setPhotoWarnings(
          Array.isArray(event.warnings)
            ? event.warnings.filter((w): w is string => typeof w === 'string')
            : [],
        );
      }
      refresh();
      refreshFeed();
      if (event.type !== 'meal_logged') {
        setImageUrl(api.snapshotImageUrl());
      }
      if (event.type === 'reset') {
        setLastScan(null);
      }
    }
  });

  async function confirm(label: string, count: number) {
    // Let the editor retain its draft on failure. Only successful saves close it.
    await api.confirmSlot(label, count);
    setReceipt(
      t(
        `${label}: ${count} boxes saved.`,
        `${label} : ${count} boîte${count === 1 ? '' : 's'} enregistrée${count === 1 ? '' : 's'}.`,
      ),
    );
    refresh();
    refreshFeed();
  }

  const slotsByLabel = useMemo(() => {
    const map = new Map<string, PantrySlot>();
    for (const s of pantry?.slots ?? []) map.set(s.slot, s);
    return map;
  }, [pantry]);

  const reviewCount = pantry?.slots.filter((slot) => slot.needs_confirmation).length ?? 0;
  const slots = pantry?.slots.filter((slot) => !flaggedOnly || slot.needs_confirmation) ?? [];
  function reviewInventory() {
    setFlaggedOnly(reviewCount > 0);
    inventory.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    inventory.current?.focus({ preventScroll: true });
  }
  return (
    <div className="pantry-page">
      <header className="pantry-heading">
        <div>
          <h1>{t('Pantry', 'Réserve')}</h1>
          <p>
            {t(
              'Know what is left, and whether it can last until the next supply.',
              'Voir ce qu’il reste, et si cela suffit jusqu’au prochain ravitaillement.',
            )}
          </p>
        </div>
        <StatusBadge level="unknown" label={t('SIMULATED stock', 'Stock SIMULÉ')} />
      </header>
      {loadError && (
        <LoadError
          label={t(
            'Inventory could not be refreshed. Displayed values may be old.',
            'Le stock n’a pas pu être actualisé. Les valeurs affichées peuvent être anciennes.',
          )}
          onRetry={refresh}
        />
      )}
      <div className="pantry-overview">
        <Panel bodyStyle={{ padding: 0 }}>
          <div className="pantry-capture-actions">
            <div className="pantry-stage-heading">
              <IconScan size={22} />
              <div>
                <h2>{t('Read the shelf', 'Lire la réserve')}</h2>
                <p>{t('A photo becomes a count to check.', 'Une photo devient un comptage à vérifier.')}</p>
              </div>
            </div>
            <ShelfCapture
              api={api}
              slots={pantry?.slots ?? []}
              boxes={pantry?.boxes ?? boxes}
              variant="station"
              onSaved={(mode) => {
                refresh();
                refreshFeed();
                setImageUrl(api.snapshotImageUrl());
                setLastScan(
                  mode === 'add'
                    ? t('Products added to stock.', 'Produits ajoutés au stock.')
                    : mode === 'replace'
                      ? t('Whole stock replaced.', 'Stock entièrement remplacé.')
                      : t('Stock counts updated.', 'Quantités du stock mises à jour.'),
                );
              }}
            />
            <p className="pantry-note">
              {t(
                'Photo → frame → review → save. Nothing is counted into stock automatically.',
                'Photo → cadrage → vérification → enregistrement. Rien n’est ajouté au stock automatiquement.',
              )}
            </p>
          </div>
          {pantry?.has_photo === false ? (
            <p className="pantry-empty-photo">
              {t(
                'No current photo. Prepare your products, then take a photo.',
                'Aucune photo actuelle. Préparez vos produits, puis prenez une photo.',
              )}
            </p>
          ) : (
            <PantryPhoto
              imageUrl={imageUrl}
              slots={slotsByLabel}
              boxes={pantry?.boxes ?? boxes}
              scanning={scanning}
              slotsDone={slotsDone}
              onConfirm={confirm}
              addedCounts={pantry?.photo_is_addition ? pantry.photo_counts : undefined}
            />
          )}
          {pantry?.has_photo !== false && (
            <p className="pantry-photo-hint">
              <IconCheck size={16} />
              {pantry?.photo_is_addition
                ? t(
                    'Photo of the last addition; the recorded stock includes previous batches and logged meals.',
                    'Photo du dernier ajout ; le stock enregistré tient compte des lots précédents et des repas consommés.',
                  )
                : t(
                    'Choose a slot in the picture to check its count.',
                    'Cliquez sur une case de la photo pour vérifier son contenu.',
                  )}
            </p>
          )}
          <div className="pantry-capture-details">
            <p className="pantry-note">
              {pantry?.snapshot_ts
                ? `${t('Last record', 'Dernier enregistrement')} · ${new Date(parseServerTime(pantry.snapshot_ts)).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : t('No scan recorded', 'Aucun scan enregistré')}
              . {t('Demo pictures are AI-generated.', 'Les photos de démo sont générées par IA.')}
            </p>
            {scanning && (
              <div role="status" className="pantry-scan-progress">
                <span className="hz-spinner" aria-hidden="true" />
                <span>
                  {slotsDone.size
                    ? `${slotsDone.size}/12 ${t('slots read', 'cases lues')}`
                    : t('Reading the picture on the station…', 'Lecture de la photo sur la station…')}
                </span>
              </div>
            )}
            {photoWarnings.length > 0 && (
              <div className="pantry-photo-warnings" role="status">
                <strong>{t('Photo to check', 'Photo à contrôler')}</strong>
                <ul>
                  {photoWarnings.map((warning) => (
                    <li key={warning}>{t(warning)}</li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <p className="pantry-error" role="alert">
                {error}
              </p>
            )}
            {lastScan && !error && (
              <p className="pantry-save-receipt hz-feedback-arrive" role="status">
                {lastScan}
              </p>
            )}
          </div>
        </Panel>
        <div className="pantry-side">
          <PantryAutonomy
            pantry={pantry}
            context={context}
            onSettings={() => navigate('/settings')}
            onSimulator={() => navigate('/forecasts')}
            onDelay={(mission) => {
              setPlannedMission(mission);
              setRationDays((mission?.next_resupply_in_days ?? 30) + 60);
              setPlanningOpen(true);
            }}
            reviewCount={reviewCount}
            onReview={reviewInventory}
          />
          <PantryPlanning
            days={rationDays}
            onDays={setRationDays}
            plan={rationPlan}
            resupply={plannedMission?.next_resupply_in_days ?? null}
            open={planningOpen}
            onClose={() => setPlanningOpen(false)}
          />
        </div>
      </div>
      <section ref={inventory} tabIndex={-1} className="pantry-inventory" aria-labelledby="inventory-title">
        <div className="pantry-inventory-heading">
          <div>
            <h2 id="inventory-title" className="pantry-heading-with-icon">
              <IconPantry size={22} />
              {t('Check the inventory', 'Vérifier le stock')}
            </h2>
            <p className="pantry-note">
              {t(
                'Compare with the photo. A count is confirmed only after your check.',
                'Comparez avec la photo. Un compte n’est confirmé qu’après votre vérification.',
              )}
            </p>
          </div>
          <div className="pantry-actions" role="group" aria-label={t('Inventory filter', 'Filtre du stock')}>
            <Button
              size="sm"
              active={!flaggedOnly}
              aria-pressed={!flaggedOnly}
              onClick={() => setFlaggedOnly(false)}
            >
              {t('All slots', 'Toutes les cases')}
            </Button>
            <Button
              size="sm"
              active={flaggedOnly}
              aria-pressed={flaggedOnly}
              onClick={() => setFlaggedOnly(true)}
            >
              {t('Flagged', 'Signalées')} · {reviewCount}
            </Button>
          </div>
        </div>
        {receipt && (
          <p className="pantry-receipt hz-feedback-arrive" role="status">
            <IconCheck size={16} />
            {receipt}
          </p>
        )}
        {!pantry && !loadError ? (
          <LoadingState label={t('Loading inventory…', 'Chargement du stock…')} />
        ) : (
          <div className="pantry-slots">
            {slots.map((slot) => (
              <PantrySlotCard key={slot.slot} slot={slot} disabled={scanning} onConfirm={confirm} />
            ))}
          </div>
        )}
        {pantry && slots.length === 0 && (
          <p>
            {t(
              'No flagged counts. Other estimates still need a human check.',
              'Aucun compte signalé. Les autres estimations restent à vérifier par une personne.',
            )}
          </p>
        )}
      </section>
      <PantryMovements consumption={consumption} feedError={feedError} />
    </div>
  );
}

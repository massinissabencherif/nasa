import { useEffect, useRef, useState } from 'react';
import type {
  ApiClient,
  PantrySlot,
  ScanResponse,
  ShelfBoxes,
  ShelfFrame,
  VisionStrategy,
} from '@hestia/api-client';
import { Button } from './Button';
import { DetailSheet } from './DetailSheet';
import { ShelfProducts } from './ShelfProducts';
import { ShelfAnalysis } from './ShelfAnalysis';
import { ShelfCamera } from './ShelfCamera';
import { ShelfFrameEditor } from './ShelfFrameEditor';
import { ShelfScanReview } from './ShelfScanReview';
import { IconPhoto, IconScan, IconReplay, IconCaution } from '../icons';
import { t } from '../i18n';

type Step = 'choose' | 'camera' | 'frame' | 'analyse' | 'review' | 'demo' | 'products';
export function ShelfCapture({
  api,
  slots,
  boxes,
  onSaved,
  variant = 'crew',
  startOpen = false,
}: {
  api: ApiClient;
  slots: PantrySlot[];
  boxes: ShelfBoxes;
  onSaved: () => void;
  variant?: 'station' | 'crew';
  /** Open the photo sheet at once (a phone that scanned the station's code). */
  startOpen?: boolean;
}) {
  const [updatedSlots, setUpdatedSlots] = useState<PantrySlot[] | null>(null);
  const currentSlots = updatedSlots ?? slots;
  const [step, setStep] = useState<Step | null>(startOpen ? 'choose' : null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [frame, setFrame] = useState<ShelfFrame>({ left: 0.05, top: 0.05, right: 0.95, bottom: 0.95 });
  const [strategy, setStrategy] = useState<VisionStrategy>('cross');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [working, setWorking] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const shot = useRef<HTMLInputElement>(null);
  // the in-page viewfinder needs HTTPS or localhost; the native camera does not
  const viewfinder = typeof window !== 'undefined' && window.isSecureContext;
  const errorBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error || !errorBox.current) return;
    errorBox.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    errorBox.current.focus({ preventScroll: true });
  }, [error, step]);
  const version = useRef(0);
  const busy = useRef(false);
  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  useEffect(() => {
    if (step !== 'analyse') return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [step]);
  function close() {
    version.current++;
    setStep(null);
    setError(null);
    setPhoto(null);
    setPhotoUrl('');
    if (result?.proposal_id) void api.discardScanReview(result.proposal_id).catch(() => {});
    setResult(null);
    setUpdatedSlots(null);
  }
  function selectPhoto(blob: Blob) {
    setPhoto(blob);
    setPhotoUrl(URL.createObjectURL(blob));
    setError(null);
    setStep('frame');
    const b = Object.values(boxes);
    setFrame(
      b.length
        ? {
            rows: Math.max(...Object.keys(boxes).map((label) => 'ABC'.indexOf(label[0]) + 1)),
            columns: Math.max(...Object.keys(boxes).map((label) => Number(label.slice(1)))),
            left: Math.min(...b.map((x) => x[0])),
            top: Math.min(...b.map((x) => x[1])),
            right: Math.max(...b.map((x) => x[2])),
            bottom: Math.max(...b.map((x) => x[3])),
          }
        : { left: 0.05, top: 0.05, right: 0.95, bottom: 0.95 },
    );
  }
  async function analyse(variant?: 'full' | 'after_removal') {
    if (busy.current || (!variant && !photo)) return;
    busy.current = true;
    setWorking(true);
    const current = ++version.current;
    setElapsed(0);
    setStep('analyse');
    setError(null);
    try {
      const response = variant
        ? await api.scanPantry({ mode: 'mock', variant })
        : await api.uploadShelfPhoto(photo!, { strategy, frame });
      if (current !== version.current) {
        if (response.proposal_id) void api.discardScanReview(response.proposal_id).catch(() => {});
        return;
      }
      if (!response.proposal_id)
        throw new Error(
          t(
            'Restart the station server to enable review before saving.',
            'Redémarrez le serveur de la station pour activer la vérification avant enregistrement.',
          ),
        );
      setResult(response);
      setStep('review');
    } catch (cause) {
      if (current !== version.current) return;
      setError(cause instanceof Error ? t(cause.message) : String(cause));
      setStep(variant ? 'demo' : 'frame');
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  const title =
    step === 'products'
      ? t('Products in the photo', 'Produits dans la photo')
      : step === 'camera'
        ? t('Camera preview', 'Aperçu caméra')
        : step === 'frame'
          ? t('Frame the shelf', 'Cadrer la réserve')
          : step === 'review'
            ? t('Check before saving', 'Vérifier avant d’enregistrer')
            : step === 'analyse'
              ? t('Reading the photo', 'Lecture de la photo')
              : t('New shelf reading', 'Nouvelle lecture du stock');
  return (
    <>
      <Button
        variant="primary"
        loading={working}
        icon={<IconScan size={18} />}
        onClick={() => {
          setError(null);
          setUpdatedSlots(null);
          setStep('choose');
        }}
      >
        {t('New photo', 'Nouvelle photo')}
      </Button>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) selectPhoto(f);
        }}
      />
      <input
        ref={shot}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) selectPhoto(f);
        }}
      />
      {step && (
        <DetailSheet title={title} onClose={close}>
          <div className="hz-shelf-flow">
            {step === 'choose' && (
              <>
                <p>
                  {t(
                    'Choose a photo. You will frame it and check the counts before saving.',
                    'Choisissez une photo. Vous la cadrez, puis vous vérifiez les quantités avant l’enregistrement.',
                  )}
                </p>
                {variant === 'crew' && (
                  <Button
                    variant="primary"
                    icon={<IconPhoto size={22} />}
                    onClick={() => shot.current?.click()}
                  >
                    {t('Take a photo', 'Prendre une photo')}
                  </Button>
                )}
                {(variant === 'station' || viewfinder) && (
                  <Button icon={<IconScan size={22} />} onClick={() => setStep('camera')}>
                    {variant === 'station'
                      ? t('Device camera', 'Caméra d’un appareil')
                      : t('Live viewfinder', 'Viseur en direct')}
                  </Button>
                )}
                <Button icon={<IconPhoto size={22} />} onClick={() => file.current?.click()}>
                  {t('Import a photo', 'Importer une photo')}
                </Button>
                <Button icon={<IconReplay size={22} />} onClick={() => setStep('demo')}>
                  {t('Rehearse with a demo', 'Répéter avec une démo')}
                </Button>
                <p className="hz-caption">
                  {t(
                    'One product type per slot, with several identical packages allowed. You assign the products; the model proposes their counts.',
                    'Un type de produit par case, avec plusieurs emballages identiques possibles. Vous attribuez les produits ; le modèle propose les quantités.',
                  )}
                </p>
              </>
            )}
            {step === 'camera' && <ShelfCamera onCapture={selectPhoto} />}
            {step === 'frame' && (
              <>
                {photoUrl && <ShelfFrameEditor imageUrl={photoUrl} value={frame} onChange={setFrame} />}
                {variant === 'station' && (
                  <Button onClick={() => setStep('products')}>
                    {t('Assign products to slots', 'Attribuer les produits aux cases')}
                  </Button>
                )}
                <fieldset className="hz-shelf-method">
                  <legend>{t('How should the photo be read?', 'Comment lire la photo ?')}</legend>
                  <div className="hz-shelf-method-options">
                    {(['full', 'cross'] as const).map((method) => (
                      <Button
                        key={method}
                        active={strategy === method}
                        aria-pressed={strategy === method}
                        onClick={() => setStrategy(method)}
                      >
                        <strong>
                          {method === 'full'
                            ? t('Simple reading', 'Lecture simple')
                            : t('In-depth reading', 'Lecture approfondie')}
                        </strong>
                        <span>
                          {method === 'full'
                            ? t('One analysis', 'Une seule analyse')
                            : t('Compared analyses · longer', 'Analyses comparées · plus long')}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <p className="hz-caption">
                    {t(
                      'Both methods need your verification before saving.',
                      'Les deux méthodes demandent votre vérification avant enregistrement.',
                    )}
                  </p>
                </fieldset>
                {error && (
                  <div className="hz-shelf-error" ref={errorBox} role="alert" tabIndex={-1}>
                    <IconCaution size={22} />
                    <div>
                      <strong>{t('Analysis did not finish', 'Analyse non aboutie')}</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}
                <Button variant="primary" onClick={() => void analyse()}>
                  {t('Analyse this frame', 'Analyser ce cadrage')}
                </Button>
                <div className="hz-shelf-actions">
                  <Button onClick={() => setStep('camera')}>{t('Retake photo', 'Reprendre la photo')}</Button>
                  <Button onClick={() => file.current?.click()}>
                    {t('Choose another photo', 'Choisir une autre photo')}
                  </Button>
                </div>
              </>
            )}
            {step === 'products' && (
              <>
                <ShelfProducts
                  api={api}
                  slots={currentSlots.filter(
                    (slot) =>
                      'ABC'.indexOf(slot.slot[0]) < (frame.rows ?? 3) &&
                      Number(slot.slot.slice(1)) <= (frame.columns ?? 4),
                  )}
                  onChanged={setUpdatedSlots}
                />
                <Button variant="primary" onClick={() => setStep('frame')}>
                  {t('Back to my photo', 'Revenir à ma photo')}
                </Button>
              </>
            )}
            {step === 'demo' && (
              <>
                <p>
                  {t(
                    'These generated pictures replay known counts without calling the model. They demonstrate the inventory workflow, not AI accuracy.',
                    'Ces images générées rejouent des quantités connues sans appeler le modèle. Elles montrent le parcours de stock, pas la précision de l’IA.',
                  )}
                </p>
                <Button onClick={() => void analyse('full')}>{t('Full shelf', 'Réserve pleine')}</Button>
                <Button onClick={() => void analyse('after_removal')}>
                  {t('Three soup boxes removed', 'Trois boîtes de soupe retirées')}
                </Button>
              </>
            )}
            {step === 'analyse' && <ShelfAnalysis elapsed={elapsed} />}
            {step === 'review' && result && (
              <ShelfScanReview
                result={result}
                slots={currentSlots}
                api={api}
                onDiscard={close}
                onSaved={() => {
                  setResult(null);
                  setStep(null);
                  setPhoto(null);
                  setPhotoUrl('');
                  setUpdatedSlots(null);
                  onSaved();
                }}
              />
            )}
            {error && step !== 'frame' && (
              <div className="hz-shelf-error" ref={errorBox} role="alert" tabIndex={-1}>
                <IconCaution size={22} />
                <p>{error}</p>
              </div>
            )}
            {step !== 'choose' && step !== 'analyse' && step !== 'review' && (
              <Button variant="ghost" onClick={() => setStep('choose')}>
                {t('Back to photo sources', 'Retour au choix de la photo')}
              </Button>
            )}
          </div>
        </DetailSheet>
      )}
    </>
  );
}

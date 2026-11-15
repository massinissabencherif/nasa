import { useState } from 'react';
import type { PantrySlot } from '@hestia/api-client';
import { DetailSheet, ShelfPhotoViewport, t } from '@hestia/ui';
import { PantrySlotCard } from './PantrySlotCard';

type Boxes = Record<string, [number, number, number, number]>;

export function PantryPhoto({
  imageUrl,
  slots,
  boxes,
  scanning,
  slotsDone,
  onConfirm,
  addedCounts,
}: {
  imageUrl: string;
  slots: Map<string, PantrySlot>;
  boxes: Boxes;
  scanning: boolean;
  slotsDone: Set<string>;
  onConfirm: (label: string, count: number) => Promise<void>;
  addedCounts?: Record<string, number>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const slot = selected ? slots.get(selected) : undefined;
  const box = selected ? boxes[selected] : undefined;
  return (
    <>
      <div className="pantry-photo">
        <ShelfPhotoViewport
          imageUrl={imageUrl}
          boxes={boxes}
          alt={t(
            'Analysed crop. Choose a slot to check its count.',
            'Cadrage analysé. Choisissez une case pour vérifier sa quantité.',
          )}
        >
          {(localBoxes) =>
            Object.entries(localBoxes).map(([label, [x0, y0, x1, y1]]) => {
              const item = slots.get(label);
              const pending = scanning && !slotsDone.has(label);
              return (
                <button
                  type="button"
                  className="pantry-photo-slot"
                  key={label}
                  disabled={scanning || item?.food_item_id == null}
                  data-review={item?.needs_confirmation || undefined}
                  data-pending={pending || undefined}
                  aria-label={`${label} · ${t(item?.item ?? 'Empty slot')} · ${t('Check count', 'Vérifier la quantité')}`}
                  style={{
                    left: `${x0 * 100}%`,
                    top: `${y0 * 100}%`,
                    width: `${(x1 - x0) * 100}%`,
                    height: `${(y1 - y0) * 100}%`,
                  }}
                  onClick={() => setSelected(label)}
                >
                  <span>
                    {label} ·{' '}
                    {pending
                      ? '…'
                      : addedCounts?.[label] != null
                        ? `+${addedCounts[label]}`
                        : (item?.count ?? '—')}
                    {item?.needs_confirmation ? ' ?' : ''}
                  </span>
                </button>
              );
            })
          }
        </ShelfPhotoViewport>
      </div>
      {slot && box && (
        <DetailSheet
          title={`${slot.slot} · ${slot.item ? t(slot.item) : t('Shelf slot', 'Case de la réserve')}`}
          onClose={() => setSelected(null)}
        >
          <p className="pantry-review-instruction">
            {addedCounts
              ? t(
                  'This picture shows the last added batch. The field below corrects the total remaining stock, not only the packages in this photo.',
                  'Cette photo montre le dernier ajout. Le champ ci-dessous corrige le stock total restant, pas seulement les produits de cette photo.',
                )
              : t(
                  'Count the boxes in this picture, then confirm or correct the number.',
                  'Comptez les boîtes sur cette image, puis confirmez ou corrigez le nombre.',
                )}
          </p>
          <ShelfPhotoViewport
            imageUrl={imageUrl}
            boxes={{ [slot.slot]: box }}
            alt={t(`Detail of shelf slot ${slot.slot}`, `Détail de la case ${slot.slot}`)}
          />
          <PantrySlotCard
            key={slot.slot}
            slot={slot}
            onConfirm={onConfirm}
            disabled={scanning}
            initiallyEditing
          />
        </DetailSheet>
      )}
    </>
  );
}

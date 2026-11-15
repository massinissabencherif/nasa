import { useState } from 'react';
import type { PantrySlot } from '@hestia/api-client';
import { Button, FoodIcon, Input, StatusBadge, t } from '@hestia/ui';

export function PantrySlotCard({
  slot,
  onConfirm,
  disabled,
  initiallyEditing = false,
}: {
  slot: PantrySlot;
  onConfirm: (label: string, count: number) => Promise<void>;
  disabled: boolean;
  initiallyEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initiallyEditing);
  const [draft, setDraft] = useState(slot.count == null ? '' : String(slot.count));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const count = Number(draft);
  const valid = draft.trim() !== '' && Number.isInteger(count) && count >= 0 && count <= slot.capacity;
  async function save() {
    if (!valid || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(slot.slot, count);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  const manual = slot.source === 'manual';
  return (
    <article className="pantry-slot" data-review={slot.needs_confirmation || undefined}>
      {!initiallyEditing && (
        <>
          <header>
            <span className="pantry-slot-id">{slot.slot}</span>
            <StatusBadge
              level={slot.needs_confirmation ? 'orange' : manual ? 'green' : 'unknown'}
              label={t(
                slot.needs_confirmation ? 'Check count' : manual ? 'Confirmed' : 'Estimate',
                slot.needs_confirmation ? 'À vérifier' : manual ? 'Confirmé' : 'Estimation',
              )}
            />
          </header>
          <div className="pantry-slot-food">
            <FoodIcon name={slot.item ?? ''} />
            <h3>{slot.item ? t(slot.item) : t('Unassigned slot', 'Case non attribuée')}</h3>
          </div>
        </>
      )}
      {editing ? (
        <form
          className="pantry-slot-edit"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor={`count-${slot.slot}`}>
            {t('Boxes counted', 'Boîtes comptées')} · {slot.slot}
          </label>
          <Input
            id={`count-${slot.slot}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={slot.capacity}
            step={1}
            value={draft}
            autoFocus
            disabled={busy || disabled}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="pantry-actions">
            <Button type="submit" variant="primary" size="sm" loading={busy} disabled={!valid || disabled}>
              {t('Confirm', 'Confirmer')}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => setEditing(false)}>
              {t('Cancel', 'Annuler')}
            </Button>
          </div>
          {error && (
            <p role="alert" className="pantry-error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <>
          <div className="pantry-slot-count">
            <strong>{slot.count ?? '—'}</strong>
            <span>
              {t('boxes', 'boîtes')}
              <small>
                {t('capacity', 'capacité')} {slot.capacity}
              </small>
            </span>
            {slot.food_item_id != null && (
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setDraft(slot.count == null ? '' : String(slot.count));
                  setError(null);
                  setSaved(false);
                  setEditing(true);
                }}
              >
                {t('Check', 'Vérifier')}
              </Button>
            )}
          </div>
          {saved && (
            <p className="pantry-save-receipt hz-feedback-arrive" role="status">
              {t('Your count is saved.', 'Votre compte est enregistré.')}
            </p>
          )}
        </>
      )}
    </article>
  );
}

import { useState } from 'react';
import { Button, Panel } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { useMealProposal, useSelectedCrewId } from '../lib/hooks';

export function Meal() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const { proposal, refresh } = useMealProposal(crewId);
  const [eating, setEating] = useState<number | 'suggestion' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function eat(foodItemIds: number[], marker: number | 'suggestion') {
    if (crewId == null) return;
    setEating(marker);
    setError(null);
    try {
      for (const id of foodItemIds) await api.eatMeal(crewId, id, 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      refresh();
      setEating(null);
    }
  }

  if (!proposal) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: 'var(--text-faint)' }}>Loading the stock…</p>
      </div>
    );
  }

  const progress = proposal.daily_need_kcal ? Math.min(100, (proposal.kcal_eaten_today / proposal.daily_need_kcal) * 100) : 0;
  const suggestionKcal = proposal.suggestion.reduce((sum, item) => sum + item.kcal, 0);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Meal of the day</h1>

      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Logged today</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            {Math.round(proposal.kcal_eaten_today)} / {Math.round(proposal.daily_need_kcal)} kcal
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--panel-raised)', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 400ms ease' }} />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 8 }}>
          Your need: Mifflin-St Jeor × activity factor, a ground formula used as an estimate.
        </p>
      </Panel>

      {proposal.suggestion.length > 0 && (
        <Panel title="Suggested from the real stock">
          <p style={{ fontSize: 'var(--text-sm)' }}>{proposal.suggestion.map((item) => item.name).join(' + ')}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', margin: '4px 0 12px' }}>
            {Math.round(suggestionKcal)} kcal, about a third of your day, protein first.
          </p>
          <Button
            variant="primary"
            size="lg"
            style={{ width: '100%' }}
            disabled={eating != null}
            onClick={() => eat(proposal.suggestion.map((item) => item.food_item_id), 'suggestion')}
          >
            {eating === 'suggestion' ? 'Logging…' : 'I ate this'}
          </Button>
        </Panel>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--text-sm)' }}>
          {error}
        </p>
      )}

      {proposal.available.length === 0 ? (
        <Panel>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            The shelf shows no stock. Ask the station to run a pantry scan.
          </p>
        </Panel>
      ) : (
        <>
          <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>Or pick what you ate</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {proposal.available.map((item) => (
              <div
                key={item.food_item_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{item.name}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                    {item.kcal} kcal · P {item.protein_g} g · C {item.carbs_g} g · F {item.fat_g} g · {item.available_portions} portions in stock
                  </p>
                </div>
                <Button onClick={() => eat([item.food_item_id], item.food_item_id)} disabled={eating != null} style={{ padding: '10px 14px' }}>
                  {eating === item.food_item_id ? '…' : 'I ate this'}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
        A logged meal lowers the expected stock by the portions you ate, at once. A camera scan counts boxes on the shelf and does not change who ate what.
      </p>
    </div>
  );
}

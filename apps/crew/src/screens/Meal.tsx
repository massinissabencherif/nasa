import { useState } from 'react';
import { Panel } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { useMealProposal, useSelectedCrewId } from '../lib/hooks';

export function Meal() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const { proposal, refresh } = useMealProposal(crewId);
  const [eating, setEating] = useState<number | null>(null);

  async function eat(foodItemId: number) {
    if (crewId == null) return;
    setEating(foodItemId);
    try {
      await api.eatMeal(crewId, foodItemId, 1);
      refresh();
    } finally {
      setEating(null);
    }
  }

  if (!proposal) {
    return <div style={{ padding: 16 }}><p style={{ color: 'var(--text-faint)' }}>Loading…</p></div>;
  }

  const progress = proposal.daily_need_kcal
    ? Math.min(100, (proposal.kcal_eaten_today / proposal.daily_need_kcal) * 100)
    : 0;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Meal of the day</h1>

      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Today's intake</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            {Math.round(proposal.kcal_eaten_today)} / {Math.round(proposal.daily_need_kcal)} kcal
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--panel-raised)', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 400ms ease' }} />
        </div>
      </Panel>

      {proposal.available.length === 0 && (
        <Panel>
          <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
            No stock data yet — ask the station to run a pantry scan.
          </p>
        </Panel>
      )}

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
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{item.name}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                {item.kcal} kcal · {item.protein_g}g protein · {item.available_count} left
              </p>
            </div>
            <button
              onClick={() => eat(item.food_item_id)}
              disabled={eating === item.food_item_id}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--accent)',
                color: '#07222c',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {eating === item.food_item_id ? '…' : 'I ate this'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

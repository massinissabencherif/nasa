import { IconCaution, IconCheck, IconCritical } from '../icons';

export type Level = 'green' | 'orange' | 'red';

const LEVEL_META: Record<Level, { icon: typeof IconCheck; color: string; dim: string; word: string }> = {
  green: { icon: IconCheck, color: 'var(--green)', dim: 'var(--green-dim)', word: 'nominal' },
  orange: { icon: IconCaution, color: 'var(--orange)', dim: 'var(--orange-dim)', word: 'caution' },
  red: { icon: IconCritical, color: 'var(--red)', dim: 'var(--red-dim)', word: 'critical' },
};

export function StatusBadge({ level, label, size = 'md' }: { level: Level; label?: string; size?: 'sm' | 'md' }) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  const pad = size === 'sm' ? '2px 8px 2px 6px' : '3px 10px 3px 7px';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: pad,
        borderRadius: 999,
        background: meta.dim,
        color: meta.color,
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={size === 'sm' ? 12 : 13} />
      {label ?? meta.word}
    </span>
  );
}

export function StatusDot({ level, size = 8 }: { level: Level; size?: number }) {
  const meta = LEVEL_META[level];
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: meta.color,
        flexShrink: 0,
      }}
    />
  );
}

export function worstLevel(levels: Level[]): Level {
  if (levels.includes('red')) return 'red';
  if (levels.includes('orange')) return 'orange';
  return 'green';
}

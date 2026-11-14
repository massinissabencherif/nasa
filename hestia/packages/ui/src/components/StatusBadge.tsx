import type { ZoneLevel } from '@hestia/api-client';
import { IconCaution, IconCheck, IconCritical, IconUnknown } from '../icons';

export const LEVEL_META: Record<ZoneLevel, { icon: typeof IconCheck; color: string; dim: string; word: string }> = {
  green: { icon: IconCheck, color: 'var(--green)', dim: 'var(--green-dim)', word: 'nominal' },
  orange: { icon: IconCaution, color: 'var(--orange)', dim: 'var(--orange-dim)', word: 'caution' },
  red: { icon: IconCritical, color: 'var(--red)', dim: 'var(--red-dim)', word: 'critical' },
  unknown: { icon: IconUnknown, color: 'var(--text-muted)', dim: 'var(--panel-raised)', word: 'no data' },
};

export function StatusBadge({ level, label, size = 'md' }: { level: ZoneLevel; label?: string; size?: 'sm' | 'md' }) {
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

export function StatusDot({ level, size = 8 }: { level: ZoneLevel; size?: number }) {
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

/** The worst known level. "unknown" only when nothing is known: it never counts as green. */
export function worstLevel(levels: ZoneLevel[]): ZoneLevel {
  if (levels.includes('red')) return 'red';
  if (levels.includes('orange')) return 'orange';
  if (levels.includes('green')) return 'green';
  return 'unknown';
}

/** Zones without recent data, to say so next to an overall level. */
export function unknownCount(levels: ZoneLevel[]): number {
  return levels.filter((level) => level === 'unknown').length;
}

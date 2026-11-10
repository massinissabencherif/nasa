import type { Level, ThresholdConfig } from '@hestia/api-client';

function formatCondition(when: Record<string, number>): string {
  const has = (k: string) => k in when;
  if (has('gte') && has('lte')) return `${when.gte}–${when.lte}`;
  if (has('gte') && has('lt')) return `${when.gte}–<${when.lt}`;
  if (has('gt') && has('lte')) return `>${when.gt}–${when.lte}`;
  if (has('gt') && has('lt')) return `>${when.gt}–<${when.lt}`;
  if (has('gte')) return `≥${when.gte}`;
  if (has('gt')) return `>${when.gt}`;
  if (has('lte')) return `≤${when.lte}`;
  if (has('lt')) return `<${when.lt}`;
  if (has('eq')) return `=${when.eq}`;
  return Object.entries(when).map(([k, v]) => `${k} ${v}`).join(', ');
}

export function formatThresholdBands(config: ThresholdConfig): string {
  const byLevel = new Map<Level, string[]>();
  for (const rule of config.rules ?? []) {
    const list = byLevel.get(rule.level) ?? [];
    list.push(formatCondition(rule.when));
    byLevel.set(rule.level, list);
  }
  const order: Level[] = ['green', 'orange', 'red'];
  const parts = order
    .filter((level) => byLevel.has(level))
    .map((level) => `${level} ${byLevel.get(level)!.join(' or ')}`);
  const unit = config.unit ? ` ${config.unit}` : '';
  return parts.join(' · ') + unit;
}

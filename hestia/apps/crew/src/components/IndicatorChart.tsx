import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Level, Measurement, ThresholdConfig } from '@hestia/api-client';

const COMPARATORS: Record<string, (v: number, b: number) => boolean> = {
  gte: (v, b) => v >= b,
  lte: (v, b) => v <= b,
  gt: (v, b) => v > b,
  lt: (v, b) => v < b,
  eq: (v, b) => v === b,
};

function levelAt(config: ThresholdConfig, value: number): Level {
  for (const rule of config.rules ?? []) {
    const conditions = Object.entries(rule.when);
    if (conditions.every(([op, bound]) => COMPARATORS[op](value, bound))) return rule.level;
  }
  return config.default ?? 'orange';
}

function computeBands(config: ThresholdConfig, domainMin: number, domainMax: number) {
  const boundaries = new Set<number>([domainMin, domainMax]);
  for (const rule of config.rules ?? []) {
    for (const bound of Object.values(rule.when)) {
      if (bound > domainMin && bound < domainMax) boundaries.add(bound);
    }
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const raw = sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1];
    const level = levelAt(config, (start + end) / 2);
    return { start, end, level };
  });
  const merged: typeof raw = [];
  for (const band of raw) {
    const last = merged[merged.length - 1];
    if (last && last.level === band.level) last.end = band.end;
    else merged.push({ ...band });
  }
  return merged;
}

const LEVEL_VAR: Record<Level, string> = {
  green: 'var(--green)',
  orange: 'var(--orange)',
  red: 'var(--red)',
};

type Props = {
  data: Measurement[];
  threshold?: ThresholdConfig;
  color?: string;
  unit?: string;
  height?: number;
};

export function IndicatorChart({ data, threshold, color = 'var(--chart-series-1)', unit, height = 200 }: Props) {
  const points = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .map((m) => ({ date: m.ts.slice(5, 10), value: m.value })),
    [data],
  );

  const { domainMin, domainMax, bands } = useMemo(() => {
    const values = points.map((p) => p.value);
    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 1;
    const pad = Math.max((dataMax - dataMin) * 0.2, 1);
    const min = dataMin - pad;
    const max = dataMax + pad;
    return {
      domainMin: min,
      domainMax: max,
      bands: threshold ? computeBands(threshold, min, max) : [],
    };
  }, [points, threshold]);

  if (points.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>No data yet.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          {bands.map((band) => (
            <ReferenceArea
              key={`${band.start}-${band.end}`}
              y1={band.start}
              y2={band.end}
              fill={LEVEL_VAR[band.level]}
              fillOpacity={0.16}
              strokeOpacity={0}
              ifOverflow="hidden"
            />
          ))}
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
            tickFormatter={(v: number) => Number(v.toFixed(1)).toString()}
            axisLine={false}
            tickLine={false}
            width={40}
            padding={{ top: 12, bottom: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={(value) => [`${value}${unit ? ` ${unit}` : ''}`, '']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

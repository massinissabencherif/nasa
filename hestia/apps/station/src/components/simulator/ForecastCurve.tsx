import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ForecastPoint } from '@hestia/api-client';
import { Panel, t } from '@hestia/ui';

export type Marker = { x?: number; y?: number; label: string; color: string };

export function ForecastCurve({
  title,
  headline,
  detail,
  badge,
  data,
  dataKey,
  unit,
  color,
  markers,
  domain,
}: {
  title: string;
  headline: string;
  detail?: string;
  badge?: ReactNode;
  data: ForecastPoint[];
  dataKey: keyof ForecastPoint;
  unit: string;
  color: string;
  markers: Marker[];
  domain?: [number | 'auto' | 'dataMin', number | 'auto' | 'dataMax'];
}) {
  return (
    <Panel title={title} action={badge}>
      <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{headline}</p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', minHeight: 17, marginBottom: 6 }}>
        {detail}
      </p>
      <div style={{ width: '100%', height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, 'dataMax']}
              tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              tickFormatter={(d: number) => `${t('d', 'j')}${d}`}
            />
            <YAxis
              domain={domain ?? ['auto', 'auto']}
              tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
              tickFormatter={(v: number) => Number(v.toFixed(1)).toString()}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
              labelFormatter={(d) => `${t('Day', 'Jour')} ${d}`}
              formatter={(value) => [`${value} ${unit}`, title]}
            />
            {markers.map((m) =>
              m.x != null ? (
                <ReferenceLine
                  key={m.label}
                  x={m.x}
                  stroke={m.color}
                  strokeDasharray="4 3"
                  label={{ value: m.label, fill: m.color, fontSize: 10, position: 'insideTopRight' }}
                />
              ) : (
                <ReferenceLine
                  key={m.label}
                  y={m.y}
                  stroke={m.color}
                  strokeDasharray="4 3"
                  label={{ value: m.label, fill: m.color, fontSize: 10, position: 'insideBottomRight' }}
                />
              ),
            )}
            <Line
              type="linear"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

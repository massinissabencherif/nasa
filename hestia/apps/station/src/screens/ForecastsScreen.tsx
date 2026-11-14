import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ForecastParams, ForecastPoint, ForecastResponse } from '@hestia/api-client';
import { Button, Panel, StatusBadge } from '@hestia/ui';
import { api } from '../lib/api';
import { useStation } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';

const DEFAULTS: ForecastParams = {
  mission_days: 460,
  ration_pct: 100,
  exercise_h_per_day: 1,
  resupply_delay_days: 0,
  solar_storm: false,
  storm_dose_msv: 50,
  storm_day: 30,
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, opacity: disabled ? 0.45 : 1 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </label>
  );
}

type Marker = { x?: number; y?: number; label: string; color: string };

function Curve({
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
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)' }}>{headline}</p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', minHeight: 17, marginBottom: 6 }}>{detail}</p>
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
              tickFormatter={(d: number) => `d${d}`}
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
              contentStyle={{ background: 'var(--panel-raised)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              labelFormatter={(d) => `Day ${d}`}
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
            <Line type="linear" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function ForecastsScreen() {
  const { context } = useStation();
  const [params, setParams] = useState<ForecastParams>(DEFAULTS);
  const [result, setResult] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  useRefreshOn(['scan_complete', 'slot_confirmed', 'meal_logged', 'reset', 'context_changed'], () => setTick((t) => t + 1));

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      api
        .forecast(params)
        .then((r) => {
          if (id === requestId.current) {
            setResult(r);
            setError(null);
          }
        })
        .catch((err) => id === requestId.current && setError(err instanceof Error ? err.message : String(err)));
    }, 120);
    return () => clearTimeout(timer);
  }, [params, tick, context?.type]);

  const set = <K extends keyof ForecastParams>(key: K, value: ForecastParams[K]) => setParams((p) => ({ ...p, [key]: value }));

  const summary = result?.summary;
  const series = result?.series ?? [];
  const noResupply = result != null && result.context.next_resupply_in_days == null;
  const resupplyMarker: Marker[] =
    summary?.resupply_day != null && summary.resupply_day <= params.mission_days
      ? [{ x: summary.resupply_day, label: 'cargo', color: 'var(--text-muted)' }]
      : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Panel title="What if…">
          <div style={{ display: 'grid', gap: 16 }}>
            <Slider label="Mission horizon" value={params.mission_days} min={30} max={1000} step={10} unit="days" onChange={(v) => set('mission_days', v)} />
            <Slider label="Ration" value={params.ration_pct} min={50} max={110} step={1} unit="% of need" onChange={(v) => set('ration_pct', v)} />
            <Slider label="Exercise" value={params.exercise_h_per_day} min={0} max={3} step={0.25} unit="h/day" onChange={(v) => set('exercise_h_per_day', v)} />
            <Slider
              label="Resupply delay"
              value={params.resupply_delay_days}
              min={0}
              max={180}
              step={5}
              unit="days late"
              disabled={noResupply}
              onChange={(v) => set('resupply_delay_days', v)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={params.solar_storm} onChange={(e) => set('solar_storm', e.target.checked)} />
              Solar storm on day {params.storm_day}
            </label>
            <Slider
              label="Storm dose"
              value={params.storm_dose_msv}
              min={10}
              max={500}
              step={10}
              unit="mSv"
              disabled={!params.solar_storm}
              onChange={(v) => set('storm_dose_msv', v)}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {summary && (
                <Button size="sm" variant="primary" onClick={() => set('ration_pct', Math.max(50, Math.floor(summary.required_ration_pct)))}>
                  Ration to last ({Math.floor(summary.required_ration_pct)} %)
                </Button>
              )}
              <Button size="sm" onClick={() => setParams(DEFAULTS)}>
                Reset
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title={`Context: ${result?.context.label ?? '…'}`}>
          {result && (
            <div style={{ display: 'grid', gap: 4, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <p>Radiation {result.context.radiation_msv_day} mSv/day</p>
              <p>
                {result.context.next_resupply_in_days != null
                  ? `Next cargo scheduled in ${result.context.next_resupply_in_days} days (assumption)`
                  : 'No resupply in this context'}
              </p>
              <p>Crew need {summary?.crew_need_kcal_day.toLocaleString('en-US')} kcal/day</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>Change the context in Mission settings.</p>
            </div>
          )}
        </Panel>
      </div>

      <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--panel)',
          }}
        >
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Simulator, not a trained model.</strong> Day-by-day arithmetic on NASA reference values
            and flagged assumptions, to anticipate the effect of a decision.
          </p>
          <Button size="sm" onClick={() => setShowAssumptions((s) => !s)}>
            {showAssumptions ? 'Hide' : 'Assumptions & sources'}
          </Button>
        </div>

        {showAssumptions && result && (
          <Panel title="Assumptions & sources">
            <div style={{ display: 'grid', gap: 10 }}>
              {result.assumptions.map((a) => (
                <div key={a.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, fontSize: 'var(--text-sm)' }}>
                  <span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        padding: '2px 7px',
                        borderRadius: 3,
                        border: '1px solid var(--border)',
                        color: a.kind === 'assumption' ? 'var(--orange)' : a.kind === 'nasa' ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      {a.kind === 'assumption' ? 'ASSUMPTION' : a.kind === 'nasa' ? 'NASA VALUE' : 'METHOD'}
                    </span>
                  </span>
                  <p style={{ color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>{a.label}. </strong>
                    {a.text}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {error && (
          <Panel>
            <p role="alert" style={{ color: 'var(--red-ink)' }}>
              {error}
            </p>
          </Panel>
        )}

        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Curve
              title="Food stock"
              headline={
                summary.stockout_day != null
                  ? `runs out on day ${summary.stockout_day}`
                  : `${series[series.length - 1]?.stock_days.toFixed(0)} days left at the end`
              }
              badge={
                summary.stockout_day != null ? (
                  <StatusBadge level="red" label={`${summary.days_without_food} days without food`} size="sm" />
                ) : summary.ration_below_floor ? (
                  <StatusBadge level="red" label={`ration under ${summary.safety_floor_pct} %`} size="sm" />
                ) : (
                  <StatusBadge level="green" label="stock holds" size="sm" />
                )
              }
              detail={
                summary.resupply_day != null
                  ? `cargo on day ${summary.resupply_day}${params.resupply_delay_days ? ` (${params.resupply_delay_days} days late)` : ''} · ${params.ration_pct} % rations`
                  : `no resupply · ${params.ration_pct} % rations`
              }
              data={series}
              dataKey="stock_days"
              unit="days of full rations"
              color="var(--chart-series-1)"
              markers={resupplyMarker}
              domain={[0, 'auto']}
            />
            <Curve
              title="Crew weight"
              headline={`${summary.weight_change_pct_final > 0 ? '+' : ''}${summary.weight_change_pct_final.toFixed(1)} % on average`}
              detail={summary.weight_per_crew.map((c) => `${c.name.split(' ')[0]} ${c.change_kg > 0 ? '+' : ''}${c.change_kg} kg`).join(' · ')}
              badge={
                <StatusBadge
                  level={summary.weight_change_pct_final <= -5 ? 'red' : summary.weight_change_pct_final <= -2 ? 'orange' : 'green'}
                  label={summary.weight_change_pct_final <= -5 ? 'severe loss' : summary.weight_change_pct_final <= -2 ? 'weight loss' : 'stable'}
                  size="sm"
                />
              }
              data={series}
              dataKey="weight_change_pct"
              unit="% vs today"
              color="var(--chart-series-2)"
              markers={[
                { y: -2, label: 'orange −2 %', color: 'var(--orange)' },
                { y: -5, label: 'red −5 %', color: 'var(--red-ink)' },
              ]}
              domain={[(min: number) => Math.min(-6, Math.floor(min)), (max: number) => Math.max(1, Math.ceil(max))] as never}
            />
            <Curve
              title="Bone mass"
              headline={`${summary.bone_pct_final.toFixed(1)} % of today`}
              detail={`−${summary.bone_loss_pct_per_month} % per month at ${params.exercise_h_per_day} h/day of exercise (assumption)`}
              data={series}
              dataKey="bone_pct"
              unit="%"
              color="var(--chart-series-1)"
              markers={[]}
              domain={[(min: number) => Math.floor(min - 1), 100] as never}
            />
            <Curve
              title="Cumulative radiation"
              headline={`${summary.radiation_msv_final.toFixed(0)} mSv · ${summary.radiation_pct_of_limit.toFixed(0)} % of limit`}
              badge={
                summary.radiation_limit_day != null ? (
                  <StatusBadge level="red" label={`limit crossed day ${summary.radiation_limit_day}`} size="sm" />
                ) : (
                  <StatusBadge level={summary.radiation_pct_of_limit >= 70 ? 'orange' : 'green'} label="under the career limit" size="sm" />
                )
              }
              detail={`${result?.context.radiation_msv_day} mSv/day${params.solar_storm ? ` + ${params.storm_dose_msv} mSv storm on day ${params.storm_day}` : ''}`}
              data={series}
              dataKey="radiation_msv"
              unit="mSv"
              color="var(--chart-series-2)"
              markers={[{ y: summary.radiation_limit_msv, label: `career limit ${summary.radiation_limit_msv} mSv`, color: 'var(--red-ink)' }]}
              domain={[0, (max: number) => Math.max(summary.radiation_limit_msv * 1.08, max)] as never}
            />
          </div>
        )}

        {summary && summary.required_ration_pct < 100 && (
          <Panel title="Decision support">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              To reach {summary.resupply_day != null ? `the cargo on day ${summary.resupply_day}` : `day ${params.mission_days}`} without
              running out, the crew has to go down to{' '}
              <strong style={{ color: summary.required_ration_below_floor ? 'var(--red)' : 'var(--text)' }}>
                {summary.required_ration_pct.toFixed(0)} % rations
              </strong>
              {summary.required_ration_below_floor
                ? `. That is below the ${summary.safety_floor_pct} % safety floor: not sustainable, ask Earth for options now.`
                : '. The weight curve shows what that costs; starting early spreads the deficit.'}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

import { Panel } from '@hestia/ui';

export function ForecastsScreen() {
  return (
    <Panel title="Forecasts">
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        The forecast simulator (mission duration, ration %, exercise, resupply delay, solar storm
        sliders) is built in a later phase. It will read from the same nutrition and reference-value
        engines already powering the Pantry screen.
      </p>
    </Panel>
  );
}

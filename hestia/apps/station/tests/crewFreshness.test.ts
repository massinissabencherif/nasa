import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freshness } from '../src/lib/crewVitals.ts';

const noon = new Date('2026-11-14T12:00:00Z').getTime();

test('no reading at all is "no data", never "today"', () => {
  assert.equal(freshness([{ reason: 'no_data', last_ts: null }], noon), 'no_data');
  assert.equal(freshness([], noon), 'no_data');
});

test('a reading from earlier in the day counts as checked in today', () => {
  assert.equal(freshness([{ reason: null, last_ts: '2026-11-14T08:30:00' }], noon), 'today');
});

test('a reading from yesterday is "no check-in today", a stale zone says too old', () => {
  assert.equal(freshness([{ reason: null, last_ts: '2026-11-13T12:00:00' }], noon), 'not_today');
  assert.equal(
    freshness([{ reason: null, last_ts: '2026-11-13T12:00:00' }, { reason: 'stale', last_ts: '2026-11-10T12:00:00' }], noon),
    'stale',
  );
});

import { crewVitals } from '../src/lib/crewVitals.ts';

test('a stale zone keeps its number but its readings lose their colour', () => {
  const zone = (reason: 'stale' | null, level: string, display: Record<string, string>) => ({
    reason,
    last_ts: '2026-11-08T12:00:00',
    level: reason ? 'unknown' : level,
    indicators: Object.fromEntries(Object.keys(display).map((key) => [key, level])),
    display,
    hazard: '',
    last_level: reason ? level : null,
  });
  const status = {
    heart: zone('stale', 'green', { systolic_bp: '118 mmHg', diastolic_bp: '74 mmHg', heart_rate: '64 bpm' }),
    immunity: zone(null, 'orange', { temperature: '37.5 °C' }),
    brain_morale: zone(null, 'green', { sleep_h: '7 h' }),
  };
  const byLabel = Object.fromEntries(crewVitals(status as never).map((vital) => [vital.label, vital]));
  assert.equal(byLabel['Heart rate'].level, null);
  assert.equal(byLabel['Heart rate'].value, '64 bpm');
  assert.equal(byLabel['Blood pressure'].level, null);
  assert.equal(byLabel['Temperature'].level, 'orange');
  assert.equal(byLabel['Sleep'].level, 'green');
});

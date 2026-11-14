import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newestReading, originLabel } from '../src/lib/latestReading.ts';

test('the newest reading is chosen by time, whatever the order of the list', () => {
  const rows = [
    { ts: '2026-11-13T12:00:00', value: 118, source: 'simulated' },
    { ts: '2026-11-14T08:30:00', value: 121, source: 'manual' },
    { ts: '2026-11-12T12:00:00', value: 116, source: 'simulated' },
  ];
  assert.equal(newestReading(rows)?.value, 121);
  assert.equal(newestReading([]), null);
});

test('an origin is said in words and an unknown one is not hidden', () => {
  assert.equal(originLabel('simulated'), 'simulated');
  assert.equal(originLabel('manual'), 'entered by you');
  assert.equal(originLabel('sensor-x'), 'sensor-x');
});

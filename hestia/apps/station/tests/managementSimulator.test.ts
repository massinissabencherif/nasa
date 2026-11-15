import assert from 'node:assert/strict';
import test from 'node:test';
import { STEPS, defaultInputs, demoInputs, fieldError, stepValid } from '../src/lib/managementSimulator.ts';

test('the simulator has five steps and starts from today’s plan', () => {
  assert.equal(STEPS.length, 5);
  const inputs = defaultInputs(380);
  assert.equal(inputs.mission_days, 500); // the next cargo plus a margin, so a delay shows
  assert.equal(inputs.resupply_delay_days, 0);
  assert.equal(inputs.ration_pct, 100);
  assert(STEPS.every((step) => stepValid(step, inputs)));
});

test('the example is a 90-day late cargo, and no delay when no cargo is planned', () => {
  assert.equal(demoInputs(380).resupply_delay_days, 90);
  assert.equal(demoInputs(null).resupply_delay_days, 0);
});

test('a step cannot be confirmed with an empty or out-of-range value', () => {
  const inputs = defaultInputs(380);
  assert.equal(stepValid('ration', { ...inputs, ration_pct: Number.NaN }), false);
  assert.equal(stepValid('ration', { ...inputs, ration_pct: 10 }), false);
  assert.equal(fieldError('ration_pct', 70), null);
});

test('a storm after the horizon is refused, and storm fields only count when a storm is chosen', () => {
  const inputs = defaultInputs(380);
  assert.equal(stepValid('radiation', { ...inputs, solar_storm: false, storm_day: 9999 }), true);
  assert.equal(stepValid('radiation', { ...inputs, solar_storm: true, storm_day: 600 }), false);
  assert.equal(stepValid('radiation', { ...inputs, solar_storm: true, storm_day: 30 }), true);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { previewReaction, ReactionRunner } from '../src/lib/reactionTest.ts';

const config = JSON.parse(readFileSync(new URL('../../../server/data/reaction_protocols.json', import.meta.url), 'utf8'));
const protocol = config.protocols[config.current];
function setup(random = 0.5) {
  let time = 0;
  let sequence = 0;
  const events = new Map<number, { at: number; callback: () => void }>();
  const later = (callback: () => void, ms: number) => {
    const id = ++sequence;
    events.set(id, { at: time + ms, callback });
    return id;
  };
  const runner = new ReactionRunner(protocol, 'device', {
    now: () => time,
    date: () => new Date(Date.UTC(2026, 10, 14) + time).toISOString(),
    random: () => random, id: () => `session-${++sequence}`,
    later, cancel: (id) => { events.delete(id); },
    frame: (callback) => later(callback, 16), cancelFrame: (id) => { events.delete(id); },
  }, () => {});
  function advance(ms: number) {
    const end = time + ms;
    for (;;) {
      const next = [...events].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      events.delete(next[0]); time = next[1].at; next[1].callback();
    }
    time = end;
  }
  function signal() { advance(protocol.wait_min_ms + random * (protocol.wait_max_ms - protocol.wait_min_ms) + 16); }
  function respond(ms = 250) { signal(); advance(ms); runner.tap(); }
  function practice() {
    runner.start();
    for (let i = 0; i < protocol.practice_trials; i++) { respond(); advance(protocol.feedback_ms); }
    assert.equal(runner.state.phase, 'ready');
    assert.deepEqual(runner.state.trials, []);
    runner.startMeasured();
  }
  return { runner, advance, signal, respond, practice, events };
}

test('one practice response is discarded; five measured responses finish exactly once', () => {
  const { runner, practice, respond, advance } = setup();
  practice();
  for (let i = 0; i < protocol.measured_trials; i++) {
    respond(200 + i * 10);
    runner.tap(); // pointer/click or two fingers in the same frame
    advance(protocol.feedback_ms);
  }
  assert.equal(runner.state.phase, 'done');
  assert.equal(runner.state.result?.practice_completed, 1);
  assert.equal(runner.state.trials.length, 5);
  assert.equal(previewReaction(runner.state.trials).median, 220);
  const result = runner.state.result;
  runner.interrupt(); runner.abandon(); runner.tap();
  assert.equal(runner.state.result, result);
});

test('false starts repeat the trial with no time; timeouts advance it with no time', () => {
  const { runner, practice, advance, signal, respond } = setup();
  practice(); runner.tap(); runner.tap();
  assert.deepEqual(runner.state.trials, [{ trial_number: 1, outcome: 'false_start' }]);
  advance(protocol.feedback_ms);
  assert.equal(runner.state.trialNumber, 1);
  signal(); advance(protocol.response_timeout_ms);
  assert.deepEqual(runner.state.trials[1], { trial_number: 1, outcome: 'no_response' });
  runner.tap(); advance(protocol.feedback_ms);
  assert.equal(runner.state.trialNumber, 2);
  respond(350);
  assert.deepEqual(previewReaction(runner.state.trials), { median: 350, valid: 1, falseStarts: 1, noResponses: 1 });
});

test('signal waits for the animation frame and the configured random delay', () => {
  for (const random of [0, 0.999]) {
    const { runner, advance } = setup(random);
    runner.start();
    advance(protocol.wait_min_ms + random * (protocol.wait_max_ms - protocol.wait_min_ms));
    assert.equal(runner.state.phase, 'wait');
    advance(16); assert.equal(runner.state.phase, 'go');
    advance(125); runner.tap();
    assert.equal(runner.state.feedback, '125 ms');
  }
});

test('focus loss stops timers and excludes the interrupted session; restart gets a new ID', () => {
  const { runner, practice, signal, advance, events } = setup();
  practice(); signal(); advance(100); runner.interrupt();
  const result = runner.state.result!;
  assert.equal(result.status, 'interrupted');
  assert.deepEqual(result.trials, [{ trial_number: 1, outcome: 'interrupted' }]);
  assert.equal(events.size, 0);
  advance(20000); runner.tap(); runner.interrupt();
  assert.equal(runner.state.result, result);
  runner.start(); runner.abandon();
  assert.notEqual(runner.state.result?.id, result.id);
  assert.equal(runner.state.result?.status, 'abandoned');
  assert.equal(runner.state.result?.practice_completed, 0);
});

test('interrupting practice or feedback never fabricates a completed trial', () => {
  const training = setup();
  training.runner.start(); training.runner.interrupt();
  assert.deepEqual(training.runner.state.result?.trials, []);
  const measured = setup(); measured.practice(); measured.respond(); measured.runner.interrupt();
  assert.equal(measured.runner.state.result?.status, 'interrupted');
  assert.equal(measured.runner.state.trials.length, 1);
  assert.equal(measured.runner.state.trials[0].outcome, 'valid');
});

test('zero valid responses stay null and the attempt limit ends an incomplete session', () => {
  assert.equal(previewReaction([{ trial_number: 1, outcome: 'no_response' }]).median, null);
  const { runner, practice, advance } = setup();
  practice();
  for (let i = 0; i < protocol.max_attempts; i++) { runner.tap(); advance(protocol.feedback_ms); }
  assert.equal(runner.state.phase, 'paused');
  assert.equal(runner.state.result?.status, 'interrupted');
  assert.equal(runner.state.trials.length, protocol.max_attempts);
});

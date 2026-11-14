import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installationId, pendingReactions, queueReaction, randomId, syncReactions, loadReactionProtocol } from '../src/lib/reactionStorage.ts';

const values = new Map<string, string>();
const storage = {
  get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

// No DOM, network or dependency is needed: test the persistence boundary itself.
test('installation ID is random, stable across calls and absent when storage is blocked', () => {
  const id = installationId();
  assert.match(id!, /^[0-9a-f-]{36}$/);
  assert.equal(installationId(), id);
  assert.notEqual(randomId(), id);
  const original = storage.getItem;
  storage.getItem = () => { throw new Error('blocked'); };
  assert.equal(installationId(), null);
  storage.getItem = original;
});

test('failed requests survive reload, stay scoped to crew/station and sync without duplicate concurrent posts', async () => {
  const body = { id: randomId(), status: 'interrupted', trials: [] } as never;
  const station = 'http://station-a';
  queueReaction(station, 1, body);
  queueReaction(station, 1, body);
  assert.equal(pendingReactions(station, 1).length, 1);
  assert.equal(pendingReactions(station, 2).length, 0);
  assert.equal(pendingReactions('http://station-b').length, 0);
  await syncReactions({ baseUrl: station, saveReactionSession: async () => { throw new Error('offline'); } } as never);
  assert.equal(pendingReactions(station, 1)[0].persisted, true);
  // A fresh module has no in-memory entries, just the persisted envelope.
  const reloaded = await import(`../src/lib/reactionStorage.ts?reload=${Date.now()}`);
  assert.equal(reloaded.pendingReactions(station, 1).length, 1);
  let posts = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const api = { baseUrl: station, saveReactionSession: async (crew: number, payload: unknown) => {
    assert.equal(crew, 1); assert.deepEqual(payload, body); posts++; await gate; return body;
  } };
  const first = reloaded.syncReactions(api);
  const second = reloaded.syncReactions(api);
  release(); await Promise.all([first, second]);
  assert.equal(posts, 1);
  assert.equal(reloaded.pendingReactions(station, 1).length, 0);
  assert.equal([...values.keys()].filter((key) => key.startsWith('hestia-reaction-pending')).length, 0);
});

test('a malformed saved entry does not hide other pending sessions; a storage failure is explicit', () => {
  values.set('hestia-reaction-pending-v1:broken', 'not json');
  const station = 'http://station-c';
  queueReaction(station, 3, { id: randomId(), trials: [] } as never);
  assert.equal(pendingReactions(station, 3).length, 1);
  const original = storage.setItem;
  storage.setItem = () => { throw new Error('full'); };
  queueReaction(station, 4, { id: randomId(), trials: [] } as never);
  const pending = pendingReactions(station, 4)[0];
  assert.equal(pending.persisted, false);
  assert.match(pending.error!, /Keep this screen open/);
  storage.setItem = original;
});

test('protocol cache is station-specific and supports an unreachable station after one successful load', async () => {
  const protocol = { version: 'test-version' };
  const baseUrl = 'http://station-cache';
  await loadReactionProtocol({ baseUrl, getReactionProtocol: async () => protocol } as never);
  const offline = { baseUrl, getReactionProtocol: async () => { throw new Error('offline'); } };
  assert.deepEqual(await loadReactionProtocol(offline as never), protocol);
  await assert.rejects(loadReactionProtocol({ ...offline, baseUrl: 'http://other-station' } as never));
});

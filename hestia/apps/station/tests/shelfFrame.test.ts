import assert from 'node:assert/strict';
import test from 'node:test';
import { moveShelfFrame, resizeShelfFrame } from '../../../packages/ui/src/shelfFrame.ts';

test('moving the whole frame preserves its size and clamps it inside the photo', () => {
  const frame = { left: .2, top: .2, right: .8, bottom: .8, rows: 2, columns: 2 };
  const moved = moveShelfFrame(frame, 2, -2);
  assert(Math.abs(moved.left - .4) < 1e-10);
  assert.equal(moved.right, 1);
  assert.equal(moved.top, 0);
  assert(Math.abs((moved.bottom - moved.top) - .6) < 1e-10);
  assert.equal(moved.rows, 2);
});
test('resizing a corner keeps the opposite corner and a usable minimum size', () => {
  const frame = { left: .2, top: .2, right: .8, bottom: .8 };
  const resized = resizeShelfFrame(frame, 'tl', .9, .9);
  assert(Math.abs(resized.left - .6) < 1e-10);
  assert.equal(resized.right, .8);
  assert.equal(resized.bottom, .8);
});

test('dragging an edge resizes only that boundary and does not translate the grid', () => {
  const frame = { left: .2, top: .2, right: .8, bottom: .8, rows: 2, columns: 1 };
  assert.deepEqual(resizeShelfFrame(frame, 'l', .1, .5), {...frame,left:.1});
  assert.deepEqual(resizeShelfFrame(frame, 'b', .3, .9), {...frame,bottom:.9});
  assert.deepEqual(resizeShelfFrame(frame, 'r', .9, .4), {...frame,right:.9});
  assert.deepEqual(resizeShelfFrame(frame, 't', .4, .1), {...frame,top:.1});
});

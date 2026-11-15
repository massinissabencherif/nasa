import type { ShelfFrame } from '@hestia/api-client';
export type FrameCorner = 'tl' | 'tr' | 'bl' | 'br';
export type FrameHandle = FrameCorner | 't' | 'r' | 'b' | 'l';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function resizeShelfFrame(value: ShelfFrame, corner: FrameHandle, x: number, y: number): ShelfFrame {
  return {
    ...value,
    left: corner.endsWith('l') ? clamp(x, 0, value.right - 0.2) : value.left,
    right: corner.endsWith('r') ? clamp(x, value.left + 0.2, 1) : value.right,
    top: corner.startsWith('t') ? clamp(y, 0, value.bottom - 0.2) : value.top,
    bottom: corner.startsWith('b') ? clamp(y, value.top + 0.2, 1) : value.bottom,
  };
}
export function moveShelfFrame(value: ShelfFrame, dx: number, dy: number): ShelfFrame {
  const x = clamp(dx, -value.left, 1 - value.right),
    y = clamp(dy, -value.top, 1 - value.bottom);
  return {
    ...value,
    left: value.left + x,
    right: value.right + x,
    top: value.top + y,
    bottom: value.bottom + y,
  };
}

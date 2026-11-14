/** Pure logic of the reaction self-test: no React, no timers, testable alone. */

export const TRIALS = 5;
export const WAIT_MIN_MS = 1500;
export const WAIT_MAX_MS = 4000;
/** A tap faster than this cannot be a reaction to the signal: it is an anticipation. */
export const ANTICIPATION_MS = 100;

export type ReactionSummary = {
  /** median reaction time in milliseconds: one slow tap does not ruin the result */
  medianMs: number;
  fastestMs: number;
  slowestMs: number;
  falseStarts: number;
};

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarise(reactionTimes: number[], falseStarts: number): ReactionSummary {
  return {
    medianMs: Math.round(median(reactionTimes)),
    fastestMs: Math.round(Math.min(...reactionTimes)),
    slowestMs: Math.round(Math.max(...reactionTimes)),
    falseStarts,
  };
}

/** Random delay before the signal, so the tap cannot be timed in advance. */
export function nextWaitMs(random: () => number = Math.random): number {
  return WAIT_MIN_MS + random() * (WAIT_MAX_MS - WAIT_MIN_MS);
}

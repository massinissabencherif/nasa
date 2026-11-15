import type { ForecastParams } from '@hestia/api-client';

/** The management simulator asks for its inputs in five short steps, each
 * confirmed by the person, then saves one frozen report. This file holds the
 * step order, the limits and the defaults; the screen only renders them. */

export type StepKey = 'mission' | 'food' | 'ration' | 'body' | 'radiation';

export const STEPS: StepKey[] = ['mission', 'food', 'ration', 'body', 'radiation'];

/** Limits mirror the server's ForecastBody validation. */
export const LIMITS = {
  mission_days: { min: 7, max: 1500 },
  resupply_delay_days: { min: 0, max: 365 },
  ration_pct: { min: 30, max: 120 },
  exercise_h_per_day: { min: 0, max: 4 },
  storm_day: { min: 1, max: 1500 },
  storm_dose_msv: { min: 0, max: 1000 },
} as const;

export type NumericKey = keyof typeof LIMITS;

/** Inputs filled before the first step: today's plan, nothing late. The
 * horizon covers the next cargo plus a margin so a delay is visible. */
export function defaultInputs(nextResupplyInDays: number | null): ForecastParams {
  return {
    mission_days: nextResupplyInDays != null ? nextResupplyInDays + 120 : 400,
    ration_pct: 100,
    exercise_h_per_day: 1,
    resupply_delay_days: 0,
    solar_storm: false,
    storm_dose_msv: 50,
    storm_day: 30,
  };
}

/** The rehearsed pitch case: the cargo is three months late. */
export function demoInputs(nextResupplyInDays: number | null): ForecastParams {
  return { ...defaultInputs(nextResupplyInDays), resupply_delay_days: nextResupplyInDays != null ? 90 : 0 };
}

export function fieldError(key: NumericKey, value: number): string | null {
  const { min, max } = LIMITS[key];
  if (!Number.isFinite(value)) return 'Enter a number.';
  if (value < min || value > max) return `Between ${min} and ${max}.`;
  return null;
}

/** Fields that each step validates before it can be confirmed. */
export function stepFields(step: StepKey, inputs: ForecastParams): NumericKey[] {
  switch (step) {
    case 'mission':
      return ['mission_days'];
    case 'food':
      return ['resupply_delay_days'];
    case 'ration':
      return ['ration_pct'];
    case 'body':
      return ['exercise_h_per_day'];
    case 'radiation':
      return inputs.solar_storm ? ['storm_day', 'storm_dose_msv'] : [];
  }
}

export function stepValid(step: StepKey, inputs: ForecastParams): boolean {
  if (step === 'radiation' && inputs.solar_storm && inputs.storm_day > inputs.mission_days) return false;
  return stepFields(step, inputs).every((key) => fieldError(key, inputs[key]) == null);
}

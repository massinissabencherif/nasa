import type { CrewStatus, Level } from '@hestia/api-client';

/** One line of the crew board: a reading, as the station already knows it. */
/** `key` is the measure key, so the screen can pick the matching instrument icon. */
export type Vital = { key: string; label: string; value: string; level: Level | null };

const number = (text: string | undefined): string | null => {
  const match = text?.match(/-?\d+(?:\.\d+)?/);
  return match ? String(Math.round(Number(match[0]) * 10) / 10) : null;
};

const worst = (...levels: (Level | null | undefined)[]): Level | null =>
  levels.includes('red') ? 'red' : levels.includes('orange') ? 'orange' : levels.includes('green') ? 'green' : null;

/** The five readings a crew lead looks at first. Pure: built from the zone
 * status the server already returns, no extra request. A missing reading is
 * shown as missing, never as a default. */
export function crewVitals(status: CrewStatus): Vital[] {
  // a reading that is too old to stand for today keeps its number but loses its colour
  const current = <T extends { reason?: unknown } | undefined>(zone: T, level: Level | null | undefined): Level | null =>
    zone && zone.reason ? null : (level ?? null);
  const heart = status.heart;
  const brain = status.brain_morale;
  const immunity = status.immunity;
  const systolic = number(heart?.display.systolic_bp);
  const diastolic = number(heart?.display.diastolic_bp);
  const pulse = number(heart?.display.heart_rate);
  const temperature = number(immunity?.display.temperature);
  const sleep = number(brain?.display.sleep_h);
  const reaction = number(brain?.display.reaction_change_pct);
  return [
    { key: 'heart_rate', label: 'Heart rate', value: pulse ? `${Math.round(Number(pulse))} bpm` : 'no data', level: current(heart, heart?.indicators.heart_rate) },
    {
      key: 'systolic_bp',
      label: 'Blood pressure',
      value: systolic && diastolic ? `${Math.round(Number(systolic))}/${Math.round(Number(diastolic))} mmHg` : 'no data',
      level: current(heart, worst(heart?.indicators.systolic_bp, heart?.indicators.diastolic_bp)),
    },
    { key: 'temperature', label: 'Temperature', value: temperature ? `${temperature} °C` : 'no data', level: current(immunity, immunity?.indicators.temperature) },
    { key: 'sleep_h', label: 'Sleep', value: sleep ? `${sleep} h` : 'no data', level: current(brain, brain?.indicators.sleep_h) },
    { key: 'reaction_ms', label: 'Legacy reaction', value: reaction ? `${Math.round(Number(reaction))} ms` : 'no test', level: current(brain, brain?.indicators.reaction_change_pct) },
  ];
}

/** ISO time of the newest reading across all zones, or null. */
export function newestReading(status: CrewStatus): string | null {
  const times = Object.values(status)
    .map((zone) => zone.last_ts)
    .filter((ts): ts is string => Boolean(ts))
    .sort();
  return times.length ? times[times.length - 1] : null;
}

export type Freshness = 'no_data' | 'stale' | 'not_today' | 'today';

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  no_data: 'No data yet',
  stale: 'Data too old',
  not_today: 'No check-in today',
  today: 'Checked in today',
};

const asUtc = (iso: string): number => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();

/** How current an astronaut's data is. "No alert" is a different question:
 * a quiet board can still mean nobody has checked in. */
export function freshness(
  zones: { reason: 'no_data' | 'stale' | null; last_ts: string | null }[],
  now: number = Date.now(),
): Freshness {
  const stamps = zones.map((zone) => zone.last_ts).filter((ts): ts is string => Boolean(ts)).map(asUtc);
  if (stamps.length === 0) return 'no_data';
  if (zones.some((zone) => zone.reason === 'stale')) return 'stale';
  const newest = new Date(Math.max(...stamps));
  return newest.toDateString() === new Date(now).toDateString() ? 'today' : 'not_today';
}

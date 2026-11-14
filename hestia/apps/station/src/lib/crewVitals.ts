import type { CrewStatus, Level } from '@hestia/api-client';

/** One line of the crew board: a reading, as the station already knows it. */
export type Vital = { label: string; value: string; level: Level | null };

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
    { label: 'Heart rate', value: pulse ? `${Math.round(Number(pulse))} bpm` : 'no data', level: heart?.indicators.heart_rate ?? null },
    {
      label: 'Blood pressure',
      value: systolic && diastolic ? `${Math.round(Number(systolic))}/${Math.round(Number(diastolic))} mmHg` : 'no data',
      level: worst(heart?.indicators.systolic_bp, heart?.indicators.diastolic_bp),
    },
    { label: 'Temperature', value: temperature ? `${temperature} °C` : 'no data', level: immunity?.indicators.temperature ?? null },
    { label: 'Sleep', value: sleep ? `${sleep} h` : 'no data', level: brain?.indicators.sleep_h ?? null },
    { label: 'Legacy reaction', value: reaction ? `${Math.round(Number(reaction))} ms` : 'no test', level: brain?.indicators.reaction_change_pct ?? null },
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

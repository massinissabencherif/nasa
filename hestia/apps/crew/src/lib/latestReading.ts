/** Describes the newest reading of a series, with its date and origin, so a
 * chart is never a picture without a source. Pure: no imports. */

export type ReadingLike = { ts: string; value: number; source: string };

const ORIGIN: Record<string, string> = {
  manual: 'entered by you',
  camera: 'read by the camera',
  simulated: 'simulated',
};

export function originLabel(source: string): string {
  return ORIGIN[source] ?? source;
}

/** The newest reading by time, or null for an empty series. */
export function newestReading<T extends ReadingLike>(rows: T[]): T | null {
  let newest: T | null = null;
  for (const row of rows) {
    if (newest === null || row.ts > newest.ts) newest = row;
  }
  return newest;
}

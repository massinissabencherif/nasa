/** Pure logic of the guided check-in: no React, no imports, testable alone.
 * Nothing here ever invents a value: an empty field stays empty. */

export type StepKey = 'feel' | 'measure' | 'review';

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'feel', label: 'Feel' },
  { key: 'measure', label: 'Measure' },
  { key: 'review', label: 'Review' },
];

export type CheckinDraft = {
  /** measure key → typed number, or '' when left empty */
  values: Record<string, number | ''>;
  /** 1 to 5, null when not answered */
  mood: number | null;
  symptoms: string[];
};

export type MeasureMeta = { label: string; unit: string };
export type ReviewRow = { key: string; label: string; value: string };

/** 0 is a real answer (no exercise): only '' and undefined mean "empty". */
export function isFilled(value: number | '' | undefined): value is number {
  return value !== '' && value !== undefined && Number.isFinite(value);
}

export function filledMeasures(draft: CheckinDraft, keys: string[]): string[] {
  return keys.filter((key) => isFilled(draft.values[key]));
}

/** How many answers the draft holds: measures, mood and symptoms. */
export function answerCount(draft: CheckinDraft, keys: string[]): number {
  return filledMeasures(draft, keys).length + (draft.mood != null ? 1 : 0) + draft.symptoms.length;
}

/** The body sent to the station: only what was answered. */
export function buildCheckinBody(draft: CheckinDraft, keys: string[]): Record<string, unknown> {
  const body: Record<string, unknown> = { symptoms: [...draft.symptoms] };
  for (const key of filledMeasures(draft, keys)) body[key] = draft.values[key];
  if (draft.mood != null) body.mood = draft.mood;
  return body;
}

/** What the review step lists. Symptoms say "None selected", not "none":
 * the station cannot tell a skipped question from a no. */
export function reviewRows(
  draft: CheckinDraft,
  keys: string[],
  meta: Record<string, MeasureMeta>,
  moods: string[],
): ReviewRow[] {
  const rows: ReviewRow[] = [];
  rows.push({
    key: 'mood',
    label: 'Mood',
    value:
      draft.mood != null
        ? `${draft.mood} of 5, ${moods[draft.mood - 1] ?? ''}`.replace(/, $/, '')
        : 'Not answered',
  });
  rows.push({
    key: 'symptoms',
    label: 'Symptoms',
    value: draft.symptoms.length > 0 ? draft.symptoms.join(', ') : 'None selected',
  });
  for (const key of filledMeasures(draft, keys)) {
    const info = meta[key];
    rows.push({
      key,
      label: info?.label ?? key,
      value: `${draft.values[key]}${info?.unit ? ` ${info.unit}` : ''}`,
    });
  }
  return rows;
}

/** Measures left empty, as a count for the review line. */
export function emptyMeasureCount(draft: CheckinDraft, keys: string[]): number {
  return keys.length - filledMeasures(draft, keys).length;
}

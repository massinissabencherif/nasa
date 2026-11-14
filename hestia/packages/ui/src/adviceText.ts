/** Split an advice message from the server into its parts, so a screen can
 * give each one its own weight: what was measured, the steps to follow,
 * side notes (e.g. the report to Earth) and the disclaimer. Pure function. */

export type ParsedAdvice = {
  /** one sentence: the value and how it compares with the range */
  finding: string | null;
  /** numbered steps, without their number */
  steps: string[];
  notes: string[];
  disclaimer: string | null;
};

const STEP = /^\d+\.\s+/;

export function parseAdvice(message: string): ParsedAdvice {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: ParsedAdvice = { finding: null, steps: [], notes: [], disclaimer: null };
  lines.forEach((line, index) => {
    if (STEP.test(line)) parsed.steps.push(line.replace(STEP, ''));
    else if (index === lines.length - 1 && /not a diagnosis/i.test(line)) parsed.disclaimer = line;
    else if (parsed.steps.length === 0 && parsed.finding === null) parsed.finding = line;
    else parsed.notes.push(line);
  });
  return parsed;
}

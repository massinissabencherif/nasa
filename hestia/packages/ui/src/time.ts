/** The server stores UTC and sends timestamps without a zone. */
export function parseServerTime(iso: string): number {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();
}

/** "3 h ago", "2 days ago": how old a reading is, in the words a person uses. */
export function formatAge(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'an unknown date';
  const minutes = Math.max(0, Math.round((now - parseServerTime(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

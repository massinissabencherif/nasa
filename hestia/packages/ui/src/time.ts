import { t } from './i18n';
/** The server stores UTC and sends timestamps without a zone. */
export function parseServerTime(iso: string): number {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();
}

/** "3 h ago", "2 days ago": how old a reading is, in the words a person uses. */
export function formatAge(iso: string | null, now: number = Date.now()): string {
  if (!iso) return t('an unknown date', 'date inconnue');
  const minutes = Math.max(0, Math.round((now - parseServerTime(iso)) / 60_000));
  if (minutes < 1) return t('just now', 'à l’instant');
  if (minutes < 60) return t(`${minutes} min ago`, `il y a ${minutes} min`);
  const hours = Math.round(minutes / 60);
  return hours < 48
    ? t(`${hours} h ago`, `il y a ${hours} h`)
    : t(`${Math.round(hours / 24)} days ago`, `il y a ${Math.round(hours / 24)} j`);
}

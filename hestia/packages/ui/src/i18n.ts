import { healthFrench } from './locales/fr-health';
import { useEffect, useSyncExternalStore } from 'react';
import { french } from './locales/fr';

export type Locale = 'en' | 'fr';
const key = 'hestia-language';
function storedLocale(): Locale {
  try {
    return localStorage.getItem(key) === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}
let locale: Locale = storedLocale();
const listeners = new Set<() => void>();
const snapshot = () => locale;
function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key === key) {
      locale = storedLocale();
      listener();
    }
  };
  window.addEventListener('storage', sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', sync);
  };
}
export function setLocale(next: Locale) {
  locale = next;
  try {
    localStorage.setItem(key, next);
  } catch {
    /* Keep this session usable without storage. */
  }
  listeners.forEach((listener) => listener());
}
export function useLocale() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'en' as Locale);
  useEffect(() => {
    document.documentElement.lang = value;
  }, [value]);
  return value;
}
/** English is the stable key and fallback. Only authored translations are
 * used; server messages are never sent to an automatic translation service. */
export function t(english: string, translation?: string): string {
  return locale === 'fr' ? (translation ?? french[english] ?? healthFrench[english] ?? english) : english;
}
export function dateLocale() {
  return locale === 'fr' ? 'fr-FR' : 'en-GB';
}

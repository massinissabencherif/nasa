const STORAGE_KEY = 'hestia-api-base';
const DEFAULT_BASE = 'http://localhost:8000';

export function getApiBase(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BASE;
}

export function setApiBase(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ''));
  window.dispatchEvent(new Event('hestia-api-base-changed'));
}

export function subscribeApiBase(cb: () => void): () => void {
  window.addEventListener('hestia-api-base-changed', cb);
  return () => window.removeEventListener('hestia-api-base-changed', cb);
}

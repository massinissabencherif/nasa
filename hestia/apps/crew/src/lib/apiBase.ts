const STORAGE_KEY = 'hestia-api-base';

function clean(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Where the station API most likely is, given how this page was opened. */
export function defaultApiBase(): string {
  const { protocol, hostname, port } = window.location;
  const isNativeShell = protocol === 'capacitor:' || (hostname === 'localhost' && port === '');
  if (isNativeShell) return 'http://localhost:8000'; // native app: must be set in Settings
  // Served by the station itself, over HTTP (:8000) or HTTPS (:8443): the API
  // is on the very same origin, which also avoids any mixed-content block.
  if (window.location.pathname.startsWith('/crew')) return window.location.origin;
  // Vite dev server: the API is on port 8000 of the same host.
  return `${protocol}//${hostname}:8000`;
}

export function getApiBase(): string {
  return localStorage.getItem(STORAGE_KEY) ?? defaultApiBase();
}

export function setApiBase(url: string): void {
  const value = clean(url);
  if (value) localStorage.setItem(STORAGE_KEY, value);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('hestia-api-base-changed'));
}

export function subscribeApiBase(cb: () => void): () => void {
  window.addEventListener('hestia-api-base-changed', cb);
  return () => window.removeEventListener('hestia-api-base-changed', cb);
}

/** `?station=http://192.168.x.x:8000` (e.g. from a QR code) sets the address once. */
export function adoptStationFromUrl(): void {
  const station = new URLSearchParams(window.location.search).get('station');
  if (station && /^https?:\/\//.test(station)) setApiBase(station);
}

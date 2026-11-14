const STORAGE_KEY = 'hestia-crew-id';

export function getSelectedCrewId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : null;
}

export function setSelectedCrewId(id: number): void {
  localStorage.setItem(STORAGE_KEY, String(id));
  window.dispatchEvent(new Event('hestia-crew-id-changed'));
}

export function clearSelectedCrewId(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('hestia-crew-id-changed'));
}

export function subscribeSelectedCrewId(cb: () => void): () => void {
  window.addEventListener('hestia-crew-id-changed', cb);
  return () => window.removeEventListener('hestia-crew-id-changed', cb);
}

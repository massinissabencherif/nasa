import type { ApiClient, ReactionProtocol, ReactionSessionDetail, ReactionSessionInput } from '@hestia/api-client';

const DEVICE_KEY = 'hestia-reaction-device-v1';
const QUEUE_PREFIX = 'hestia-reaction-pending-v1:';
const listeners = new Set<() => void>();
const memory = new Map<string, PendingReaction>();
const saved = new Map<string, ReactionSessionDetail>();
const inFlight = new Map<string, Promise<void>>();
let revision = 0;

export type PendingReaction = {
  station: string;
  crewId: number;
  body: ReactionSessionInput;
  persisted: boolean;
  error: string | null;
};

export function randomId(): string {
  // getRandomValues also works on a plain-HTTP LAN; randomUUID requires a secure context.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function installationId(): string | null {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return null;
  }
}

function notify() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeReactionSync(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key?.startsWith(QUEUE_PREFIX)) notify();
  };
  window.addEventListener('storage', storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', storage);
  };
}

export const reactionSyncRevision = () => revision;

export function pendingReactions(station: string, crewId?: number): PendingReaction[] {
  const entries = new Map<string, PendingReaction>();
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(QUEUE_PREFIX)) continue;
      try {
        const entry = JSON.parse(localStorage.getItem(key) ?? 'null') as PendingReaction | null;
        if (entry?.body?.id && !saved.has(entry.body.id)) entries.set(entry.body.id, { ...entry, persisted: true });
      } catch { /* One unreadable entry must not hide the other pending sessions. */ }
    }
  } catch { /* A storage failure must not drop the in-memory result. */ }
  for (const [id, entry] of memory) entries.set(id, entry);
  return [...entries.values()].filter((entry) => entry.station === station && (crewId == null || entry.crewId === crewId));
}

export function queueReaction(station: string, crewId: number, body: ReactionSessionInput) {
  if (saved.has(body.id) || pendingReactions(station, crewId).some((entry) => entry.body.id === body.id)) return;
  const entry: PendingReaction = { station, crewId, body, persisted: false, error: null };
  try {
    localStorage.setItem(QUEUE_PREFIX + body.id, JSON.stringify(entry));
    entry.persisted = true;
  } catch {
    entry.error = 'This browser could not keep a local copy. Keep this screen open until the station saves the result.';
  }
  memory.set(body.id, entry);
  notify();
}

export function savedReaction(id: string) {
  return saved.get(id);
}

export async function syncReactions(api: ApiClient, crewId?: number) {
  await Promise.all(pendingReactions(api.baseUrl, crewId).map((entry) => {
    const id = entry.body.id;
    const current = inFlight.get(id);
    if (current) return current;
    const request = (async () => {
      try {
        const result = await api.saveReactionSession(entry.crewId, entry.body);
        saved.set(id, result);
        memory.delete(id);
        try { localStorage.removeItem(QUEUE_PREFIX + id); } catch { /* server ID makes a later retry harmless */ }
      } catch (error) {
        memory.set(id, { ...entry, error: error instanceof Error ? error.message : 'Station unavailable.' });
      } finally {
        inFlight.delete(id);
        notify();
      }
    })();
    inFlight.set(id, request);
    return request;
  }));
}

export async function loadReactionProtocol(api: ApiClient): Promise<ReactionProtocol> {
  const key = `hestia-reaction-protocol:${api.baseUrl}`;
  try {
    const protocol = await api.getReactionProtocol();
    try { localStorage.setItem(key, JSON.stringify(protocol)); } catch { /* online use still works */ }
    return protocol;
  } catch (error) {
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached) as ReactionProtocol;
    } catch { /* the screen reports the original connection error */ }
    throw error;
  }
}

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from '@hestia/api-client';
import { getApiBase, subscribeApiBase } from './apiBase';

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const base = useSyncExternalStore(subscribeApiBase, getApiBase, getApiBase);
  const api = useMemo(() => createApiClient(base), [base]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used within ApiProvider');
  return api;
}

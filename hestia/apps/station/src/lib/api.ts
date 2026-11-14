import { createApiClient } from '@hestia/api-client';

export const API_BASE = 'http://localhost:8000';
export const api = createApiClient(API_BASE);

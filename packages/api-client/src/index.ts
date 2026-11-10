export type HealthResponse = {
  status: string;
  service: string;
};

export function createApiClient(baseUrl: string) {
  return {
    health: (): Promise<HealthResponse> =>
      fetch(`${baseUrl}/health`).then((res) => res.json()),
  };
}

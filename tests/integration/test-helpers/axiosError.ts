export function createAxiosError(overrides: Record<string, unknown>) {
  return {
    name: "AxiosError",
    message: "Request failed",
    isAxiosError: true,
    config: {
      url: "/api/orders/list",
    },
    ...overrides,
  }
}

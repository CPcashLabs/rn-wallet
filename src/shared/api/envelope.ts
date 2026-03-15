export type ApiEnvelope<T> = {
  code: number | string
  message: string
  data: T
  total?: number
  page?: number
  per_page?: number
}

export function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

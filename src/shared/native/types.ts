import { NativeCapabilityUnavailableError } from "@/shared/errors"

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: Error }

export type CapabilityDescriptor = {
  supported: boolean
  reason?: string
}

export function unsupportedCapability(capability: string): CapabilityDescriptor {
  return {
    supported: false,
    reason: `${capability} is not implemented in WP-00`,
  }
}

export function unavailableResult<T>(capability: string): AdapterResult<T> {
  return {
    ok: false,
    error: new NativeCapabilityUnavailableError(capability),
  }
}

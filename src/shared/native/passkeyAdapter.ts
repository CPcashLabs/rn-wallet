import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { readNativePasskeyCapability } from "@/shared/native/nativePasskeyModule"

export type PasskeyAssertion = {
  credentialId: string
  rawId: string
  address: string
  signature: string
  message: {
    address: string
    login_time: string
  }
  displayName?: string
}

export interface PasskeyAdapter {
  getCapability(): CapabilityDescriptor
  register(input: { username: string }): Promise<AdapterResult<PasskeyAssertion>>
  authenticate(input?: { rawId?: string }): Promise<AdapterResult<PasskeyAssertion>>
}

const PASSKEY_SIGNER_DISABLED_REASON =
  "Passkey sign-in is disabled until a hardware-backed native signer replaces the JS private-key derivation flow."

function disabledPasskeyResult(): AdapterResult<PasskeyAssertion> {
  return {
    ok: false,
    error: new NativeCapabilityUnavailableError("passkey", PASSKEY_SIGNER_DISABLED_REASON),
  }
}

export const passkeyAdapter: PasskeyAdapter = {
  getCapability() {
    const nativeCapability = readNativePasskeyCapability()

    return {
      supported: false,
      reason: nativeCapability.supported ? PASSKEY_SIGNER_DISABLED_REASON : nativeCapability.reason ?? PASSKEY_SIGNER_DISABLED_REASON,
    }
  },
  async register(_input) {
    return disabledPasskeyResult()
  },
  async authenticate(_input) {
    return disabledPasskeyResult()
  },
}

import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { resolvePasskeyRpId } from "@/shared/config/runtime"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { authenticateNativePasskey, readNativePasskeyCapability, registerNativePasskey } from "@/shared/native/nativePasskeyModule"
import { createPasskeyLoginSignature } from "@/shared/native/passkeyWallet"

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

async function toPasskeyAssertion(payload: { credentialId: string; rawId: string; userId: string }, displayName?: string): Promise<PasskeyAssertion> {
  const signedPayload = await createPasskeyLoginSignature(payload.userId)

  return {
    credentialId: payload.credentialId,
    rawId: payload.rawId,
    address: signedPayload.address,
    signature: signedPayload.signature,
    message: signedPayload.message,
    displayName,
  }
}

export const passkeyAdapter: PasskeyAdapter = {
  getCapability() {
    return readNativePasskeyCapability()
  },
  async register(input) {
    const capability = readNativePasskeyCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("passkey", capability.reason),
      }
    }

    try {
      const nativeResult = await registerNativePasskey({
        username: input.username.trim(),
        rpId: resolvePasskeyRpId(),
      })
      const signedPayload = await toPasskeyAssertion(nativeResult)

      return {
        ok: true,
        data: {
          ...signedPayload,
          displayName: `${input.username.trim()}${signedPayload.address.slice(-4)}`,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Passkey registration failed"),
      } as AdapterResult<PasskeyAssertion>
    }
  },
  async authenticate(input) {
    const capability = readNativePasskeyCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("passkey", capability.reason),
      }
    }

    try {
      const nativeResult = await authenticateNativePasskey({
        rawId: input?.rawId,
        rpId: resolvePasskeyRpId(),
      })

      return {
        ok: true,
        data: await toPasskeyAssertion(nativeResult),
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Passkey authentication failed"),
      } as AdapterResult<PasskeyAssertion>
    }
  },
}

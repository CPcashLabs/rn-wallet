import { NativeModules, Platform } from "react-native"

import { NativeCapabilityUnavailableError } from "@/shared/errors"

type NativePasskeyConstants = {
  isSupported?: boolean
  reason?: string
}

export type NativePasskeyRegistrationPayload = {
  credentialId: string
  rawId: string
  userId: string
  clientDataJSON?: string | null
  attestationObject?: string | null
}

export type NativePasskeyAuthenticationPayload = {
  credentialId: string
  rawId: string
  userId: string
  clientDataJSON?: string | null
  authenticatorData?: string | null
  signature?: string | null
}

type NativePasskeyModuleShape = NativePasskeyConstants & {
  register(input: { username: string; rpId: string }): Promise<NativePasskeyRegistrationPayload>
  authenticate(input: { rawId?: string; rpId: string }): Promise<NativePasskeyAuthenticationPayload>
}

const nativePasskeyModule = NativeModules.CPCashPasskey as NativePasskeyModuleShape | undefined

export function readNativePasskeyCapability() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      supported: false,
      reason: "Passkey is only available on iOS and Android.",
    }
  }

  if (!nativePasskeyModule) {
    return {
      supported: false,
      reason: "Passkey native module is not installed.",
    }
  }

  if (nativePasskeyModule.isSupported === false) {
    return {
      supported: false,
      reason: nativePasskeyModule.reason ?? "Passkey is not supported on this device.",
    }
  }

  if (typeof nativePasskeyModule.reason === "string" && nativePasskeyModule.reason.trim()) {
    return {
      supported: false,
      reason: nativePasskeyModule.reason,
    }
  }

  return {
    supported: true,
  }
}

function requireNativePasskeyModule() {
  if (!nativePasskeyModule) {
    throw new NativeCapabilityUnavailableError("passkey", "Passkey native module is not installed.")
  }

  return nativePasskeyModule
}

export async function registerNativePasskey(input: { username: string; rpId: string }) {
  return requireNativePasskeyModule().register(input)
}

export async function authenticateNativePasskey(input: { rawId?: string; rpId: string }) {
  return requireNativePasskeyModule().authenticate(input)
}

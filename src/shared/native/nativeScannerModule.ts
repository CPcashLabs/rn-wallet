import { NativeModules, Platform } from "react-native"

import { NativeCapabilityUnavailableError } from "@/shared/errors"

type NativeScanPayload = {
  value: string
}

type NativeScannerConstants = {
  scannerCameraSupported?: boolean
  scannerImageSupported?: boolean
  scannerReason?: string
}

type NativeScannerModuleShape = NativeScannerConstants & {
  scan(): Promise<NativeScanPayload>
  scanImage(): Promise<NativeScanPayload>
}

const nativeScannerModule = NativeModules.CPCashFilePicker as NativeScannerModuleShape | undefined

export type NativeScannerMode = "camera" | "image"

export function readNativeScannerCapability(mode: NativeScannerMode = "camera") {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      supported: false,
      reason: "Scanning is only available on iOS and Android.",
    }
  }

  if (!nativeScannerModule) {
    return {
      supported: false,
      reason: "Scanner native module is not installed.",
    }
  }

  const supported = mode === "camera" ? nativeScannerModule.scannerCameraSupported : nativeScannerModule.scannerImageSupported

  if (supported === false) {
    return {
      supported: false,
      reason: nativeScannerModule.scannerReason ?? "Scanner is not supported on this device.",
    }
  }

  if (supported !== true) {
    return {
      supported: false,
      reason: nativeScannerModule.scannerReason ?? "Scanner capability is unavailable.",
    }
  }

  return {
    supported: true,
  }
}

function requireNativeScannerModule(mode: NativeScannerMode) {
  const capability = readNativeScannerCapability(mode)
  if (!capability.supported || !nativeScannerModule) {
    throw new NativeCapabilityUnavailableError("scanner", capability.reason)
  }

  return nativeScannerModule
}

export async function scanWithNativeCamera() {
  return requireNativeScannerModule("camera").scan()
}

export async function scanWithNativeImage() {
  return requireNativeScannerModule("image").scanImage()
}

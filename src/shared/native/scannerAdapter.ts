import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { readNativeScannerCapability, scanWithNativeCamera, scanWithNativeImage, type NativeScannerMode } from "@/shared/native/nativeScannerModule"
import { unavailableResult } from "@/shared/native/types"

export interface ScannerAdapter {
  getCapability(mode?: NativeScannerMode): CapabilityDescriptor
  scan(): Promise<AdapterResult<{ value: string }>>
  scanImage(): Promise<AdapterResult<{ value: string }>>
}

export const scannerAdapter: ScannerAdapter = {
  getCapability(mode = "camera") {
    return readNativeScannerCapability(mode)
  },
  async scan() {
    const capability = readNativeScannerCapability("camera")
    if (!capability.supported) {
      return unavailableResult("scanner")
    }

    try {
      return {
        ok: true,
        data: await scanWithNativeCamera(),
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeNativeScannerError(error),
      }
    }
  },
  async scanImage() {
    const capability = readNativeScannerCapability("image")
    if (!capability.supported) {
      return unavailableResult("scanner")
    }

    try {
      return {
        ok: true,
        data: await scanWithNativeImage(),
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeNativeScannerError(error),
      }
    }
  },
}

function normalizeNativeScannerError(error: unknown) {
  const normalized = error instanceof Error ? error : new Error("Scanning failed")

  if (typeof error === "object" && error !== null) {
    const code = Reflect.get(error, "code")
    const message = Reflect.get(error, "message")

    if (typeof code === "string") {
      ;(normalized as Error & { code?: string }).code = code
    }

    if (typeof message === "string" && message.trim()) {
      normalized.message = message
    }
  }

  return normalized
}

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { pickNativeImage, readNativeFilePickerCapability, saveNativeImage } from "@/shared/native/nativeFilePickerModule"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unavailableResult } from "@/shared/native/types"

export interface FileAdapter {
  getCapability(): CapabilityDescriptor
  pickImage(): Promise<AdapterResult<{ uri: string; name?: string; mimeType?: string }>>
  exportFile(input: { filename: string; content: string; mimeType?: string }): Promise<AdapterResult<void>>
  saveImage(input: { filename: string; base64: string }): Promise<AdapterResult<void>>
}

export const fileAdapter: FileAdapter = {
  getCapability() {
    return readNativeFilePickerCapability()
  },
  async pickImage() {
    const capability = readNativeFilePickerCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("file", capability.reason),
      }
    }

    try {
      return {
        ok: true,
        data: await pickNativeImage(),
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeNativeFileError(error),
      }
    }
  },
  async exportFile() {
    return unavailableResult("file")
  },
  async saveImage(input) {
    const capability = readNativeFilePickerCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("file", capability.reason),
      }
    }

    try {
      await saveNativeImage(input.filename, input.base64)
      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeNativeFileError(error),
      }
    }
  },
}

export function isNativeImagePickerCancelledError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === "NativeImagePickerCancelledError") {
    return true
  }

  const code = Reflect.get(error, "code")
  if (code === "cancelled") {
    return true
  }

  return error.message.trim().toLowerCase() === "user cancelled image selection."
}

function normalizeNativeFileError(error: unknown) {
  const normalized = error instanceof Error ? error : new Error("Image picking failed")

  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message")
    const code = Reflect.get(error, "code")

    if (typeof message === "string" && message.trim()) {
      normalized.message = message
    }

    if (typeof code === "string") {
      ;(normalized as Error & { code?: string }).code = code
    }
  }

  if (isNativeImagePickerCancelledError(normalized)) {
    normalized.name = "NativeImagePickerCancelledError"
  }

  return normalized
}

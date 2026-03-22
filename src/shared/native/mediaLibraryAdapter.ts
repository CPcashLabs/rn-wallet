import * as MediaLibrary from "expo-media-library"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { readFileSystemCapability, removeTemporaryFile, writeTemporaryFile } from "@/shared/native/fileSystemStorage"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface MediaLibraryAdapter {
  getCapability(): CapabilityDescriptor
  saveImage(input: { filename: string; base64: string; mimeType?: string }): Promise<AdapterResult<void>>
}

export const mediaLibraryAdapter: MediaLibraryAdapter = {
  getCapability() {
    return readFileSystemCapability()
  },
  async saveImage(input) {
    const capability = readFileSystemCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("media-library", capability.reason),
      }
    }

    let temporaryFileUri = ""

    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true)
      if (!permission.granted) {
        return {
          ok: false,
          error: new Error("Photo library permission was denied."),
        }
      }

      temporaryFileUri = await writeTemporaryFile({
        directoryName: "media-library",
        filename: input.filename,
        mimeType: input.mimeType ?? "image/png",
        fallbackBaseName: "saved-image",
        fallbackExtension: "png",
        content: input.base64,
        encoding: "base64",
      })

      await MediaLibrary.saveToLibraryAsync(temporaryFileUri)

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeMediaLibraryError(error),
      }
    } finally {
      if (temporaryFileUri) {
        await removeTemporaryFile(temporaryFileUri).catch(() => undefined)
      }
    }
  },
}

function normalizeMediaLibraryError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Saving image to the media library failed.")
}

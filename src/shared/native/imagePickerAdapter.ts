import { Image, Platform } from "react-native"
import { launchImageLibrary, type Asset } from "react-native-image-picker"

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { copyToTemporaryFile, ensureFileUri, readFileSystemCapability, resolveMimeTypeFromFilename } from "@/shared/native/fileSystemStorage"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

const IMAGE_PICKER_CANCELLED_MESSAGE = "User cancelled image selection."

export type PickedImageAsset = {
  uri: string
  name?: string
  mimeType?: string
  width: number
  height: number
  fileSize?: number
}

export interface ImagePickerAdapter {
  getCapability(): CapabilityDescriptor
  pickImage(): Promise<AdapterResult<PickedImageAsset>>
}

export const imagePickerAdapter: ImagePickerAdapter = {
  getCapability() {
    return readImagePickerCapability()
  },
  async pickImage() {
    const capability = readImagePickerCapability()
    if (!capability.supported) {
      return {
        ok: false,
        error: new NativeCapabilityUnavailableError("image-picker", capability.reason),
      }
    }

    try {
      const response = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        quality: 1,
        assetRepresentationMode: "current",
      })

      if (response.didCancel) {
        return {
          ok: false,
          error: createCancelledImagePickerError(),
        }
      }

      if (response.errorCode || response.errorMessage) {
        return {
          ok: false,
          error: createImagePickerError(response.errorMessage || "Image selection failed.", response.errorCode),
        }
      }

      const asset = response.assets?.[0]
      if (!asset) {
        return {
          ok: false,
          error: createImagePickerError("No image was selected."),
        }
      }

      return {
        ok: true,
        data: await normalizePickedImage(asset),
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeImagePickerError(error),
      }
    }
  },
}

export function readImagePickerCapability() {
  const fileSystemCapability = readFileSystemCapability()
  if (!fileSystemCapability.supported) {
    return fileSystemCapability
  }

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      supported: false,
      reason: "Image picking is only available on iOS and Android.",
    }
  }

  return {
    supported: true,
  }
}

export function isImagePickerCancelledError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = Reflect.get(error, "code")
  return (
    error.name === "ImagePickerCancelledError" ||
    code === "cancelled" ||
    error.message.trim().toLowerCase() === IMAGE_PICKER_CANCELLED_MESSAGE.toLowerCase()
  )
}

export const isNativeImagePickerCancelledError = isImagePickerCancelledError

function createImagePickerError(message: string, code?: string) {
  const error = new Error(message) as Error & { code?: string }
  if (code) {
    error.code = code
  }
  return error
}

function createCancelledImagePickerError() {
  const error = createImagePickerError(IMAGE_PICKER_CANCELLED_MESSAGE, "cancelled")
  error.name = "ImagePickerCancelledError"
  return error
}

function normalizeImagePickerError(error: unknown) {
  if (isImagePickerCancelledError(error)) {
    return createCancelledImagePickerError()
  }

  const normalized = error instanceof Error ? error : new Error("Image selection failed.")
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

  return normalized
}

async function normalizePickedImage(asset: Asset): Promise<PickedImageAsset> {
  const localUri = await ensureLocalImageUri(asset)
  const size = await resolveImageSize(localUri, asset)
  const mimeType = normalizeMimeType(asset.type, asset.fileName, localUri)

  return {
    uri: localUri,
    name: sanitizePickedFilename(asset.fileName, mimeType),
    mimeType,
    width: size.width,
    height: size.height,
    fileSize: typeof asset.fileSize === "number" ? asset.fileSize : undefined,
  }
}

async function ensureLocalImageUri(asset: Asset) {
  const candidateUri = ensureFileUri(asset.uri ?? "")
  if (!candidateUri) {
    throw createImagePickerError("Selected image URI is missing.")
  }

  if (candidateUri.startsWith("file://")) {
    return candidateUri
  }

  const mimeType = normalizeMimeType(asset.type, asset.fileName, candidateUri)
  return copyToTemporaryFile({
    sourceUri: candidateUri,
    directoryName: "picked-images",
    filename: asset.fileName,
    mimeType,
    fallbackBaseName: "picked-image",
    fallbackExtension: "jpg",
  })
}

async function resolveImageSize(uri: string, asset: Asset) {
  if (typeof asset.width === "number" && asset.width > 0 && typeof asset.height === "number" && asset.height > 0) {
    return {
      width: asset.width,
      height: asset.height,
    }
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    )
  })
}

function normalizeMimeType(mimeType?: string, filename?: string, uri?: string) {
  const normalizedMimeType = String(mimeType ?? "").trim().toLowerCase()
  if (normalizedMimeType) {
    return normalizedMimeType === "image/jpg" ? "image/jpeg" : normalizedMimeType
  }

  return resolveMimeTypeFromFilename(filename || uri, "image/jpeg")
}

function sanitizePickedFilename(filename: string | undefined, mimeType: string) {
  const fallbackExtension = mimeType === "image/png" ? "png" : "jpg"
  const basename = String(filename ?? "")
    .trim()
    .replace(/[\\/]/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")

  if (basename) {
    return basename
  }

  return `image.${fallbackExtension}`
}

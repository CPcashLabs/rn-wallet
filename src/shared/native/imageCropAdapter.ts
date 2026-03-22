import { FlipType, SaveFormat, manipulateAsync } from "expo-image-manipulator"

import type { PickedImageAsset } from "@/shared/native/imagePickerAdapter"
import type { AdapterResult } from "@/shared/native/types"

export type ImageCropTransform = {
  crop: {
    originX: number
    originY: number
    width: number
    height: number
  }
  context?: {
    rotationAngle?: number
    flipVertical?: boolean
    flipHorizontal?: boolean
  }
  resize?: {
    width: number
    height: number
  }
}

export interface ImageCropAdapter {
  cropImage(input: {
    source: PickedImageAsset
    transform: ImageCropTransform
    format?: "jpeg" | "png"
    compress?: number
    filename?: string
  }): Promise<AdapterResult<PickedImageAsset>>
}

export const imageCropAdapter: ImageCropAdapter = {
  async cropImage(input) {
    try {
      const actions = []
      const rotationAngle = normalizeRotation(input.transform.context?.rotationAngle)
      if (input.transform.context?.flipHorizontal) {
        actions.push({
          flip: FlipType.Horizontal,
        })
      }
      if (input.transform.context?.flipVertical) {
        actions.push({
          flip: FlipType.Vertical,
        })
      }
      if (rotationAngle !== 0) {
        actions.push({
          rotate: rotationAngle,
        })
      }
      if (input.transform.resize) {
        actions.push({
          resize: input.transform.resize,
        })
      }
      actions.push({
        crop: input.transform.crop,
      })

      const format = input.format === "png" ? SaveFormat.PNG : SaveFormat.JPEG
      const mimeType = format === SaveFormat.PNG ? "image/png" : "image/jpeg"
      const extension = format === SaveFormat.PNG ? "png" : "jpg"
      const result = await manipulateAsync(input.source.uri, actions, {
        compress: input.compress ?? 0.9,
        format,
      })

      return {
        ok: true,
        data: {
          uri: result.uri,
          name: sanitizeOutputFilename(input.filename, extension),
          mimeType,
          width: result.width,
          height: result.height,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: normalizeImageCropError(error),
      }
    }
  },
}

function normalizeRotation(rotationAngle?: number) {
  if (typeof rotationAngle !== "number" || !Number.isFinite(rotationAngle)) {
    return 0
  }

  return rotationAngle
}

function sanitizeOutputFilename(filename: string | undefined, extension: string) {
  const normalized = String(filename ?? "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/]/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")

  return `${normalized || "cropped-image"}.${extension}`
}

function normalizeImageCropError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error("Image cropping failed.")
}

import { Share, type ShareContent } from "react-native"

import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { readFileSystemCapability, removeTemporaryFile, writeTemporaryFile } from "@/shared/native/fileSystemStorage"
import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface ShareAdapter {
  getCapability(): CapabilityDescriptor
  share(input: {
    title?: string
    message?: string
    url?: string
    image?: {
      filename: string
      base64: string
      mimeType?: string
    }
  }): Promise<AdapterResult<void>>
}

export const shareAdapter: ShareAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  async share(input) {
    if (!input.message && !input.url && !input.image) {
      return {
        ok: false,
        error: new Error("Share content is empty."),
      }
    }

    let temporaryFileUri = ""

    try {
      if (input.image) {
        const capability = readFileSystemCapability()
        if (!capability.supported) {
          return {
            ok: false,
            error: new NativeCapabilityUnavailableError("share", capability.reason),
          }
        }

        temporaryFileUri = await writeTemporaryFile({
          directoryName: "share",
          filename: input.image.filename,
          mimeType: input.image.mimeType ?? "image/png",
          fallbackBaseName: "shared-image",
          fallbackExtension: "png",
          content: input.image.base64,
          encoding: "base64",
        })
      }

      const message = input.image
        ? input.message
        : [input.message, input.url].filter(value => typeof value === "string" && value.trim().length > 0).join("\n") || undefined
      const url = temporaryFileUri || input.url
      const shareContent: ShareContent = url
        ? message
          ? {
              title: input.title,
              message,
              url,
            }
          : {
              title: input.title,
              url,
            }
        : {
            title: input.title,
            message: message ?? "",
          }

      await Share.share(shareContent)

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Native share failed"),
      }
    } finally {
      if (temporaryFileUri) {
        await removeTemporaryFile(temporaryFileUri).catch(() => undefined)
      }
    }
  },
}

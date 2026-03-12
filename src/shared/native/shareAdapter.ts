import { Share } from "react-native"

import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface ShareAdapter {
  getCapability(): CapabilityDescriptor
  share(input: { title?: string; message: string; url?: string }): Promise<AdapterResult<void>>
}

export const shareAdapter: ShareAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  async share(input) {
    try {
      await Share.share({
        title: input.title,
        message: input.url ? `${input.message}\n${input.url}` : input.message,
        url: input.url,
      })

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Native share failed"),
      }
    }
  },
}

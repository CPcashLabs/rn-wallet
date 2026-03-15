import Clipboard from "@react-native-clipboard/clipboard"

import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface ClipboardAdapter {
  getCapability(): CapabilityDescriptor
  setString(value: string): Promise<AdapterResult<void>>
}

export const clipboardAdapter: ClipboardAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  async setString(value) {
    try {
      Clipboard.setString(value)

      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Clipboard write failed"),
      }
    }
  },
}

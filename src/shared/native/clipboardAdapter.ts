import { NativeModules } from "react-native"

import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

type RNCClipboardModule = {
  setString(content: string): void
  getString(): Promise<string>
}

const nativeClipboard = NativeModules.RNCClipboard as RNCClipboardModule | undefined

export interface ClipboardAdapter {
  getCapability(): CapabilityDescriptor
  setString(value: string): Promise<AdapterResult<void>>
}

export const clipboardAdapter: ClipboardAdapter = {
  getCapability() {
    return {
      supported: nativeClipboard != null,
    }
  },
  async setString(value) {
    if (!nativeClipboard) {
      return {
        ok: false,
        error: new Error("RNCClipboard native module is not available"),
      }
    }

    try {
      nativeClipboard.setString(value)

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

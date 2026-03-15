import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

export interface ClipboardAdapter {
  getCapability(): CapabilityDescriptor
  setString(value: string): Promise<AdapterResult<void>>
}

function getClipboardModule(): { setString(content: string): void } {
  const module = require("@react-native-clipboard/clipboard") as {
    default?: { setString(content: string): void }
    setString?: (content: string) => void
  }

  if (module.default?.setString) {
    return module.default
  }

  if (module.setString) {
    return { setString: module.setString }
  }

  throw new Error("Clipboard module is not available")
}

export const clipboardAdapter: ClipboardAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  async setString(value) {
    try {
      getClipboardModule().setString(value)

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

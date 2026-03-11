import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unavailableResult, unsupportedCapability } from "@/shared/native/types"

export interface ShareAdapter {
  getCapability(): CapabilityDescriptor
  share(input: { title?: string; message: string; url?: string }): Promise<AdapterResult<void>>
}

export const shareAdapter: ShareAdapter = {
  getCapability() {
    return unsupportedCapability("share")
  },
  async share() {
    return unavailableResult("share")
  },
}


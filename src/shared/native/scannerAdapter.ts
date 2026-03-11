import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unavailableResult, unsupportedCapability } from "@/shared/native/types"

export interface ScannerAdapter {
  getCapability(): CapabilityDescriptor
  scan(): Promise<AdapterResult<{ value: string }>>
  scanImage(): Promise<AdapterResult<{ value: string }>>
}

export const scannerAdapter: ScannerAdapter = {
  getCapability() {
    return unsupportedCapability("scanner")
  },
  async scan() {
    return unavailableResult("scanner")
  },
  async scanImage() {
    return unavailableResult("scanner")
  },
}


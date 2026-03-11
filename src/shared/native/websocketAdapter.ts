import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unavailableResult, unsupportedCapability } from "@/shared/native/types"

export interface WebSocketAdapter {
  getCapability(): CapabilityDescriptor
  connect(url: string): Promise<AdapterResult<void>>
  disconnect(): Promise<AdapterResult<void>>
}

export const websocketAdapter: WebSocketAdapter = {
  getCapability() {
    return unsupportedCapability("websocket")
  },
  async connect() {
    return unavailableResult("websocket")
  },
  async disconnect() {
    return unavailableResult("websocket")
  },
}


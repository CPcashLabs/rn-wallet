import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"
import { unavailableResult } from "@/shared/native/types"

export type ParsedDeepLink = {
  raw: string | null
  isValid: boolean
  scheme: string | null
  host: string | null
  pathSegments: string[]
  query: Record<string, string>
}

export interface DeepLinkAdapter {
  getCapability(): CapabilityDescriptor
  parse(url: string | null): ParsedDeepLink
  open(url: string): Promise<AdapterResult<void>>
}

export const deepLinkAdapter: DeepLinkAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  parse(url) {
    if (!url) {
      return {
        raw: url,
        isValid: false,
        scheme: null,
        host: null,
        pathSegments: [],
        query: {},
      }
    }

    try {
      const parsed = new URL(url)
      const query = Object.fromEntries(parsed.searchParams.entries())

      return {
        raw: url,
        isValid: true,
        scheme: parsed.protocol.replace(":", ""),
        host: parsed.host,
        pathSegments: parsed.pathname.split("/").filter(Boolean),
        query,
      }
    } catch {
      return {
        raw: url,
        isValid: false,
        scheme: null,
        host: null,
        pathSegments: [],
        query: {},
      }
    }
  },
  async open() {
    return unavailableResult("deepLink.open")
  },
}


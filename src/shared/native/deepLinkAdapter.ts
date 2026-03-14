import { Linking } from "react-native"

import type { AdapterResult, CapabilityDescriptor } from "@/shared/native/types"

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

function emptyParsedDeepLink(url: string | null): ParsedDeepLink {
  return {
    raw: url,
    isValid: false,
    scheme: null,
    host: null,
    pathSegments: [],
    query: {},
  }
}

function parseDeepLinkUrl(url: string): ParsedDeepLink {
  const schemeMatch = url.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) {
    return emptyParsedDeepLink(url)
  }

  const scheme = schemeMatch[1].toLowerCase()
  let remainder = url.slice(schemeMatch[0].length)
  let host: string | null = null

  if (remainder.startsWith("//")) {
    remainder = remainder.slice(2)
    const authorityEnd = remainder.search(/[/?#]/)
    if (authorityEnd === -1) {
      host = remainder || null
      remainder = ""
    } else {
      host = remainder.slice(0, authorityEnd) || null
      remainder = remainder.slice(authorityEnd)
    }
  }

  const hashIndex = remainder.indexOf("#")
  const withoutHash = hashIndex >= 0 ? remainder.slice(0, hashIndex) : remainder
  const queryIndex = withoutHash.indexOf("?")
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : ""

  return {
    raw: url,
    isValid: true,
    scheme,
    host,
    pathSegments: pathname.split("/").filter(Boolean),
    query: Object.fromEntries(new URLSearchParams(search).entries()),
  }
}

export const deepLinkAdapter: DeepLinkAdapter = {
  getCapability() {
    return {
      supported: true,
    }
  },
  parse(url) {
    if (!url) {
      return emptyParsedDeepLink(url)
    }

    return parseDeepLinkUrl(url)
  },
  async open(url) {
    try {
      await Linking.openURL(url)
      return {
        ok: true,
        data: undefined,
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error("Failed to open URL"),
      }
    }
  },
}

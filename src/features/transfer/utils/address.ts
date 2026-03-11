const EVM_ADDRESS_PATTERN = /(?:0x|0X)?[a-fA-F0-9]{40}/
const TRON_ADDRESS_PATTERN = /T[a-zA-Z0-9]{33}/

function withGlobalFlag(regex: RegExp) {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`
  return new RegExp(regex.source, flags)
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeCandidate(candidate: string) {
  return candidate.trim().replace(/^["']+|["']+$/g, "")
}

function findByRegexes(candidate: string, regexes: RegExp[]) {
  const normalized = normalizeCandidate(candidate)

  if (!normalized) {
    return ""
  }

  for (const regex of regexes) {
    if (regex.test(normalized)) {
      return normalized
    }
  }

  for (const regex of regexes) {
    const match = normalized.match(withGlobalFlag(regex))
    if (match?.[0]) {
      return normalizeCandidate(match[0])
    }
  }

  return ""
}

export function isTronChainName(chainName: string) {
  return chainName.trim().toUpperCase().includes("TRON")
}

export function resolveTransferChainType(chainName: string): "TRON" | "EVM" {
  return isTronChainName(chainName) ? "TRON" : "EVM"
}

export function buildAddressRegexes(patterns: string[] | undefined, receiveChainName: string) {
  const compiled = (patterns ?? []).reduce<RegExp[]>((acc, pattern) => {
    try {
      acc.push(new RegExp(pattern))
    } catch {
      return acc
    }

    return acc
  }, [])

  if (compiled.length > 0) {
    return compiled
  }

  if (isTronChainName(receiveChainName)) {
    return [/^T[a-zA-Z0-9]{33}$/]
  }

  return [/^(0x|0X)?[a-fA-F0-9]{40}$/]
}

export function extractTransferAddress(input: string, regexes: RegExp[]) {
  const raw = input.trim()
  if (!raw) {
    return ""
  }

  const candidates = new Set<string>([raw, safeDecode(raw)])

  for (const value of Array.from(candidates)) {
    try {
      const parsed = new URL(value)
      const queryKeys = ["address", "to", "recipient", "recv_address", "wallet_address"]
      for (const key of queryKeys) {
        const nextValue = parsed.searchParams.get(key)
        if (nextValue) {
          candidates.add(nextValue)
          candidates.add(safeDecode(nextValue))
        }
      }

      if (parsed.pathname) {
        candidates.add(parsed.pathname.replace(/^\/+/, ""))
      }
    } catch {
      const match = value.match(/[?&](address|to|recipient|recv_address|wallet_address)=([^&#]+)/i)
      if (match?.[2]) {
        candidates.add(match[2])
        candidates.add(safeDecode(match[2]))
      }
    }
  }

  for (const candidate of candidates) {
    const matched = findByRegexes(candidate, regexes)
    if (matched) {
      return matched
    }
  }

  const fallbackPattern = regexes.some(regex => regex.source.includes("T[a-zA-Z0-9]{33}"))
    ? TRON_ADDRESS_PATTERN
    : EVM_ADDRESS_PATTERN

  for (const candidate of candidates) {
    const match = normalizeCandidate(candidate).match(fallbackPattern)
    if (match?.[0]) {
      return normalizeCandidate(match[0])
    }
  }

  return ""
}

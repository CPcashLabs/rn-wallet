import { Buffer } from "buffer"

const metamaskJazzicon = require("@metamask/jazzicon") as (diameter: number, seed: number) => VirtualElement

const DEFAULT_SEED = 0x13579bdf
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const BASE58_INDEX: Record<string, number> = Object.fromEntries(BASE58_ALPHABET.split("").map((char, index) => [char, index]))
const TRANSFORM_PATTERN = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+) [\d.]+ [\d.]+\)/

export type JazziconShapeSpec = {
  fill: string
  translateX: number
  translateY: number
  rotateDeg: string
}

export type JazziconSpec = {
  background: string
  shapes: JazziconShapeSpec[]
}

type VirtualElement = {
  children: VirtualElement[]
  style: Record<string, string>
  attributes: Record<string, string>
  appendChild: (child: VirtualElement) => void
  setAttributeNS: (_namespace: string | null, key: string, value: string | number) => void
}

function createVirtualElement(): VirtualElement {
  return {
    children: [],
    style: {},
    attributes: {},
    appendChild(child) {
      this.children.push(child)
    },
    setAttributeNS(_namespace, key, value) {
      this.attributes[key] = String(value)
    },
  }
}

function withVirtualDocument<T>(run: () => T) {
  const host = globalThis as typeof globalThis & { document?: unknown }
  const originalDocument = host.document

  host.document = {
    createElement: () => createVirtualElement(),
    createElementNS: () => createVirtualElement(),
  }

  try {
    return run()
  } finally {
    if (originalDocument === undefined) {
      Reflect.deleteProperty(host, "document")
    } else {
      host.document = originalDocument
    }
  }
}

function parseTransform(transform: string) {
  const match = TRANSFORM_PATTERN.exec(transform)

  if (!match) {
    throw new Error(`Unexpected jazzicon transform: ${transform}`)
  }

  return {
    translateX: Number.parseFloat(match[1]),
    translateY: Number.parseFloat(match[2]),
    rotateDeg: `${match[3]}deg`,
  }
}

export function createJazziconSpec(diameter: number, seed: number): JazziconSpec {
  return withVirtualDocument(() => {
    const container = metamaskJazzicon(diameter, seed)
    const svg = container.children[0]
    const shapes = (svg?.children ?? []).map(shape => ({
      fill: shape.attributes.fill ?? "#000000",
      ...parseTransform(shape.attributes.transform ?? ""),
    }))

    return {
      background: container.style.background ?? "#000000",
      shapes,
    }
  })
}

export function resolveJazziconSeed(source: string) {
  const normalized = source.trim()

  if (!normalized) {
    return DEFAULT_SEED
  }

  if (normalized.startsWith("T")) {
    const tronHexAddress = tronToEthereumHex(normalized)

    if (tronHexAddress) {
      return parseHexSeed(tronHexAddress)
    }
  }

  if (normalized.startsWith("0x")) {
    return parseHexSeed(normalized)
  }

  return hashString(normalized) || DEFAULT_SEED
}

function parseHexSeed(value: string) {
  if (!value.startsWith("0x") || value.length < 10) {
    return hashString(value) || DEFAULT_SEED
  }

  const chunk = value.slice(2, 10)
  const parsed = Number.parseInt(chunk, 16)

  return Number.isFinite(parsed) && parsed !== 0 ? parsed : DEFAULT_SEED
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

function tronToEthereumHex(address: string) {
  const decoded = decodeBase58(address)
  if (!decoded || decoded.length < 21) {
    return ""
  }

  const hex = Buffer.from(decoded).toString("hex")
  return `0x${hex.slice(2, 42)}`
}

function decodeBase58(value: string) {
  let bytes = [0]

  for (const character of value) {
    const index = BASE58_INDEX[character]
    if (index == null) {
      return null
    }

    let carry = index
    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      carry += bytes[byteIndex]! * 58
      bytes[byteIndex] = carry & 0xff
      carry >>= 8
    }

    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  for (const character of value) {
    if (character !== "1") {
      break
    }

    bytes.push(0)
  }

  return Uint8Array.from(bytes.reverse())
}

import { Buffer } from "buffer"

const BASE_COLORS = [
  "#01888C",
  "#FC7500",
  "#034F5D",
  "#F73F01",
  "#FC1960",
  "#C7144C",
  "#F3C100",
  "#1598F2",
  "#2465E1",
  "#F19E02",
]

const SHAPE_COUNT = 4
const HUE_WOBBLE = 30
const DEFAULT_SEED = 0x13579bdf
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const BASE58_INDEX: Record<string, number> = Object.fromEntries(BASE58_ALPHABET.split("").map((char, index) => [char, index]))

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

export function createJazziconSpec(diameter: number, seed: number): JazziconSpec {
  const generator = new MersenneTwister(seed)
  const remainingColors = hueShift(BASE_COLORS.slice(), generator)
  const background = pickColor(remainingColors, generator)
  const shapes: JazziconShapeSpec[] = []

  for (let index = 0; index < SHAPE_COUNT - 1; index += 1) {
    shapes.push(createShapeSpec(remainingColors, diameter, index, SHAPE_COUNT - 1, generator))
  }

  return {
    background,
    shapes,
  }
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

function createShapeSpec(
  remainingColors: string[],
  diameter: number,
  index: number,
  total: number,
  generator: MersenneTwister,
): JazziconShapeSpec {
  const firstRotation = generator.random()
  const angle = Math.PI * 2 * firstRotation
  const velocity = diameter / total * generator.random() + index * diameter / total
  const translateX = Math.cos(angle) * velocity
  const translateY = Math.sin(angle) * velocity
  const secondRotation = generator.random()

  return {
    fill: pickColor(remainingColors, generator),
    translateX,
    translateY,
    rotateDeg: `${(firstRotation * 360 + secondRotation * 180).toFixed(1)}deg`,
  }
}

function pickColor(colors: string[], generator: MersenneTwister) {
  generator.random()
  const index = Math.floor(colors.length * generator.random())
  return colors.splice(index, 1)[0]
}

function hueShift(colors: string[], generator: MersenneTwister) {
  const amount = generator.random() * 30 - HUE_WOBBLE / 2
  return colors.map(color => rotateHexColor(color, amount))
}

function rotateHexColor(hex: string, amount: number) {
  const { red, green, blue } = hexToRgb(hex)
  const hsl = rgbToHsl(red, green, blue)
  const rotatedHue = normalizeHue(Math.round(hsl.hue) + amount)
  return rgbToHex(...hslToRgb(Math.round(rotatedHue), Math.round(hsl.saturation), Math.round(hsl.lightness)))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map(value => clampColor(value).toString(16).padStart(2, "0").toUpperCase())
    .join("")}`
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) {
    return {
      hue: 0,
      saturation: 0,
      lightness: lightness * 100,
    }
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let hue = 0

  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0)
      break
    case g:
      hue = (b - r) / delta + 2
      break
    default:
      hue = (r - g) / delta + 4
      break
  }

  return {
    hue: hue * 60,
    saturation: saturation * 100,
    lightness: lightness * 100,
  }
}

export function hslToRgb(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100
  const l = lightness / 100

  if (s === 0) {
    const value = l * 255
    return [value, value, value] as const
  }

  const hueSector = hue / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    hueToRgb(p, q, hueSector + 1 / 3) * 255,
    hueToRgb(p, q, hueSector) * 255,
    hueToRgb(p, q, hueSector - 1 / 3) * 255,
  ] as const
}

export function normalizeHue(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function hueToRgb(p: number, q: number, t: number) {
  let value = t

  if (value < 0) {
    value += 1
  }
  if (value > 1) {
    value -= 1
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value
  }
  if (value < 1 / 2) {
    return q
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6
  }

  return p
}

export function parseHexSeed(value: string) {
  if (!value.startsWith("0x") || value.length < 10) {
    return hashString(value) || DEFAULT_SEED
  }

  const parsed = Number.parseInt(value.slice(2, 10), 16)
  return Number.isFinite(parsed) ? parsed >>> 0 : hashString(value) || DEFAULT_SEED
}

export function tronToEthereumHex(address: string) {
  try {
    const decoded = decodeBase58(address)

    if (decoded.length !== 25) {
      return ""
    }

    return `0x${Buffer.from(decoded.slice(1, 21)).toString("hex")}`
  } catch {
    return ""
  }
}

export function decodeBase58(value: string) {
  const bytes: number[] = [0]

  for (const char of value) {
    const carryValue = BASE58_INDEX[char]

    if (carryValue === undefined) {
      throw new Error("invalid base58")
    }

    let carry = carryValue

    for (let index = 0; index < bytes.length; index += 1) {
      const result = bytes[index] * 58 + carry
      bytes[index] = result & 0xff
      carry = result >> 8
    }

    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  for (const char of value) {
    if (char !== "1") {
      break
    }

    bytes.push(0)
  }

  return Uint8Array.from(bytes.reverse())
}

export function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export class MersenneTwister {
  private static readonly N = 624
  private static readonly M = 397
  private static readonly MATRIX_A = 0x9908b0df
  private static readonly UPPER_MASK = 0x80000000
  private static readonly LOWER_MASK = 0x7fffffff

  private readonly mt = new Array<number>(MersenneTwister.N)
  private mti = MersenneTwister.N + 1

  constructor(seed: number) {
    this.initSeed(seed)
  }

  random() {
    return this.randomInt() * (1 / 4294967296)
  }

  private initSeed(seed: number) {
    this.mt[0] = seed >>> 0

    for (this.mti = 1; this.mti < MersenneTwister.N; this.mti += 1) {
      const value = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30)
      this.mt[this.mti] =
        (((((value & 0xffff0000) >>> 16) * 1812433253) << 16) + (value & 0x0000ffff) * 1812433253) + this.mti
      this.mt[this.mti] >>>= 0
    }
  }

  private randomInt() {
    let value
    const mag01 = [0x0, MersenneTwister.MATRIX_A]

    if (this.mti >= MersenneTwister.N) {
      let index = 0

      if (this.mti === MersenneTwister.N + 1) {
        this.initSeed(5489)
      }

      for (; index < MersenneTwister.N - MersenneTwister.M; index += 1) {
        value = (this.mt[index] & MersenneTwister.UPPER_MASK) | (this.mt[index + 1] & MersenneTwister.LOWER_MASK)
        this.mt[index] = this.mt[index + MersenneTwister.M] ^ (value >>> 1) ^ mag01[value & 0x1]
      }

      for (; index < MersenneTwister.N - 1; index += 1) {
        value = (this.mt[index] & MersenneTwister.UPPER_MASK) | (this.mt[index + 1] & MersenneTwister.LOWER_MASK)
        this.mt[index] = this.mt[index + (MersenneTwister.M - MersenneTwister.N)] ^ (value >>> 1) ^ mag01[value & 0x1]
      }

      value = (this.mt[MersenneTwister.N - 1] & MersenneTwister.UPPER_MASK) | (this.mt[0] & MersenneTwister.LOWER_MASK)
      this.mt[MersenneTwister.N - 1] = this.mt[MersenneTwister.M - 1] ^ (value >>> 1) ^ mag01[value & 0x1]
      this.mti = 0
    }

    value = this.mt[this.mti]
    this.mti += 1
    value ^= value >>> 11
    value ^= (value << 7) & 0x9d2c5680
    value ^= (value << 15) & 0xefc60000
    value ^= value >>> 18

    return value >>> 0
  }
}

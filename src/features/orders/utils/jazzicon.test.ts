import {
  MersenneTwister,
  createJazziconSpec,
  decodeBase58,
  hashString,
  hslToRgb,
  hueToRgb,
  normalizeHue,
  parseHexSeed,
  resolveJazziconSeed,
  rgbToHsl,
  tronToEthereumHex,
} from "@/features/orders/utils/jazzicon"

type FakeElement = {
  children: FakeElement[]
  style: Record<string, string>
  attributes: Record<string, string>
  appendChild: (child: FakeElement) => void
  setAttributeNS: (_namespace: string | null, key: string, value: string | number) => void
}

const METAMASK_JAZZICON = require("../../../../../cpcash-vue/node_modules/@metamask/jazzicon")

function createFakeElement(): FakeElement {
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

function installFakeDocument() {
  return {
    createElement: () => createFakeElement(),
    createElementNS: () => createFakeElement(),
  }
}

function parsePackageTransform(transform: string) {
  const match = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+) [\d.]+ [\d.]+\)/.exec(transform)

  if (!match) {
    throw new Error(`Unexpected transform: ${transform}`)
  }

  return {
    translateX: Number.parseFloat(match[1]),
    translateY: Number.parseFloat(match[2]),
    rotateDeg: `${match[3]}deg`,
  }
}

describe("jazzicon", () => {
  const originalDocument = (globalThis as { document?: unknown }).document

  afterEach(() => {
    ;(globalThis as { document?: unknown }).document = originalDocument
  })

  it("matches the MetaMask jazzicon palette and transform algorithm", () => {
    ;(globalThis as { document?: unknown }).document = installFakeDocument()

    const diameter = 44
    const seed = 0x12345678
    const packageResult = METAMASK_JAZZICON(diameter, seed) as FakeElement
    const packageSvg = packageResult.children[0]
    const packageShapes = packageSvg.children.map(shape => ({
      fill: shape.attributes.fill,
      ...parsePackageTransform(shape.attributes.transform),
    }))

    const result = createJazziconSpec(diameter, seed)

    expect(result.background).toBe(packageResult.style.background)
    expect(result.shapes).toHaveLength(packageShapes.length)

    result.shapes.forEach((shape, index) => {
      expect(shape.fill).toBe(packageShapes[index].fill)
      expect(shape.rotateDeg).toBe(packageShapes[index].rotateDeg)
      expect(shape.translateX).toBeCloseTo(packageShapes[index].translateX, 6)
      expect(shape.translateY).toBeCloseTo(packageShapes[index].translateY, 6)
    })
  })

  it("derives the same seed for hex and tron addresses used by the Vue app", () => {
    expect(resolveJazziconSeed("0x4f53c0e06763abd049fadfff86e420f36adb58a0")).toBe(1330888928)
    expect(resolveJazziconSeed("THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw")).toBe(1330888928)
  })

  it("falls back to deterministic seeds for empty, short hex and invalid tron inputs", () => {
    expect(resolveJazziconSeed("")).toBe(0x13579bdf)
    expect(resolveJazziconSeed("0x123")).toBe(resolveJazziconSeed("0x123"))
    expect(resolveJazziconSeed("T0-invalid-tron-address")).toBe(resolveJazziconSeed("T0-invalid-tron-address"))
    expect(resolveJazziconSeed("plain-text-seed")).toBe(resolveJazziconSeed("plain-text-seed"))
  })

  it("creates deterministic shape specs for arbitrary seeds", () => {
    const spec = createJazziconSpec(32, resolveJazziconSeed("plain-text-seed"))

    expect(spec.shapes).toHaveLength(3)
    spec.shapes.forEach(shape => {
      expect(shape.fill.startsWith("#")).toBe(true)
      expect(shape.rotateDeg.endsWith("deg")).toBe(true)
      expect(Number.isFinite(shape.translateX)).toBe(true)
      expect(Number.isFinite(shape.translateY)).toBe(true)
    })
  })

  it("covers internal helper edge cases", () => {
    const zeroHashInput = String.fromCharCode(0xcb33, 0xa1d9, 0x0001)
    const shortHexZeroHashInput = `0x${String.fromCharCode(0x5e1a, 0xaabd, 0x0000)}`
    const longHexZeroHashInput = `0x${String.fromCharCode(0x5e1a, 0xaabd, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000)}`

    expect(hashString(zeroHashInput)).toBe(0)
    expect(resolveJazziconSeed(zeroHashInput)).toBe(0x13579bdf)
    expect(parseHexSeed(shortHexZeroHashInput)).toBe(0x13579bdf)
    expect(parseHexSeed(longHexZeroHashInput)).toBe(0x13579bdf)

    expect(rgbToHsl(128, 128, 128)).toEqual({
      hue: 0,
      saturation: 0,
      lightness: expect.closeTo(50.19607843137255, 12),
    })
    expect(rgbToHsl(10, 240, 30).hue).toBeGreaterThan(90)
    expect(hslToRgb(42, 0, 50)).toEqual([127.5, 127.5, 127.5])
    expect(normalizeHue(-30)).toBe(330)
    expect(hueToRgb(0.2, 0.8, -0.1)).toBeCloseTo(hueToRgb(0.2, 0.8, 0.9), 12)

    expect(tronToEthereumHex("111")).toBe("")
    expect(tronToEthereumHex("0-not-base58")).toBe("")
    expect(decodeBase58("1112")).toBeInstanceOf(Uint8Array)

    const lazyTwister = Object.create(MersenneTwister.prototype) as {
      mt: number[]
      mti: number
      random: () => number
    }
    lazyTwister.mt = new Array(624).fill(0)
    lazyTwister.mti = 625

    expect(Number.isFinite(lazyTwister.random())).toBe(true)
  })
})

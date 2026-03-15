import { createJazziconSpec, resolveJazziconSeed } from "@/features/orders/utils/jazzicon"

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
})

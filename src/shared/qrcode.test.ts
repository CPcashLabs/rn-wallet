const mockCreate = jest.fn((_value?: unknown, _options?: unknown) => ({
  modules: {
    size: 2,
    data: [1, 0, 0, 1],
  },
}))
const mockDrawRect = jest.fn()
const mockFlush = jest.fn()
const mockEncodeToBase64 = jest.fn(() => "mock")
const mockMakeImageSnapshot = jest.fn(() => ({
  encodeToBase64: mockEncodeToBase64,
}))
const mockGetCanvas = jest.fn(() => ({
  drawRect: mockDrawRect,
}))
const mockMakeOffscreen = jest.fn(() => ({
  getCanvas: mockGetCanvas,
  flush: mockFlush,
  makeImageSnapshot: mockMakeImageSnapshot,
}))
const mockSetAntiAlias = jest.fn()
const mockSetColor = jest.fn()
const mockPaint = jest.fn(() => ({
  setAntiAlias: mockSetAntiAlias,
  setColor: mockSetColor,
}))
const mockColor = jest.fn((value?: unknown) => `color:${String(value)}`)
const mockXYWHRect = jest.fn((x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
}))

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    create: (value: unknown, options: unknown) => mockCreate(value, options),
  },
}))

jest.mock("@shopify/react-native-skia", () => ({
  __esModule: true,
  ImageFormat: {
    PNG: "PNG",
  },
  Skia: {
    Color: (value: unknown) => mockColor(value),
    Paint: () => mockPaint(),
    XYWHRect: (x: number, y: number, width: number, height: number) => mockXYWHRect(x, y, width, height),
    Surface: {
      MakeOffscreen: (width: number, height: number) => mockMakeOffscreen(width, height),
    },
  },
}))

import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix } from "@/shared/qrcode"

describe("shared qrcode helpers", () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockDrawRect.mockClear()
    mockFlush.mockClear()
    mockEncodeToBase64.mockClear()
    mockMakeImageSnapshot.mockClear()
    mockGetCanvas.mockClear()
    mockMakeOffscreen.mockClear()
    mockSetAntiAlias.mockClear()
    mockSetColor.mockClear()
    mockPaint.mockClear()
    mockColor.mockClear()
    mockXYWHRect.mockClear()
  })

  it("builds QR data URLs from byte segments without mutating global TextEncoder", async () => {
    const originalTextEncoder = globalThis.TextEncoder

    await expect(buildQrCodeDataUrl("你好", { margin: 1 })).resolves.toBe("data:image/png;base64,mock")

    expect(globalThis.TextEncoder).toBe(originalTextEncoder)
    expect(mockCreate).toHaveBeenCalledTimes(1)

    const [segments, options] = mockCreate.mock.calls[0] as unknown as [
      Array<{ data: Uint8Array; mode: string }>,
      { errorCorrectionLevel: string },
    ]
    expect(Array.isArray(segments)).toBe(true)
    expect(segments).toHaveLength(1)
    expect(segments[0]?.mode).toBe("byte")
    expect(segments[0]?.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(segments[0]?.data ?? [])).toEqual([228, 189, 160, 229, 165, 189])
    expect(options).toEqual({
      errorCorrectionLevel: "M",
    })
    expect(mockMakeOffscreen).toHaveBeenCalledWith(32, 32)
    expect(mockEncodeToBase64).toHaveBeenCalledWith("PNG", 100)
  })

  it("encodes supplementary-plane characters and merges default colors", async () => {
    await buildQrCodeDataUrl("😀", {
      color: {
        dark: "#ffffff",
      },
    })

    const [segments] = mockCreate.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
    expect(Array.from(segments[0]?.data ?? [])).toEqual([240, 159, 152, 128])
    expect(mockColor).toHaveBeenNthCalledWith(1, "#FFFFFFFF")
    expect(mockColor).toHaveBeenNthCalledWith(2, "#ffffff")
  })

  it("encodes two-byte utf8 characters", async () => {
    await buildQrCodeDataUrl("é")

    const [segments] = mockCreate.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
    expect(Array.from(segments[0]?.data ?? [])).toEqual([195, 169])
  })

  it("builds QR matrices from byte segments", () => {
    expect(buildQrMatrix("A", { errorCorrectionLevel: "H" })).toEqual({
      size: 2,
      rows: [
        [true, false],
        [false, true],
      ],
    })

    const [segments] = mockCreate.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
    expect(segments[0]?.mode).toBe("byte")
    expect(Array.from(segments[0]?.data ?? [])).toEqual([65])
  })

  it("keeps unmatched surrogate halves as three-byte utf8 and uses the default matrix error correction level", async () => {
    await buildQrCodeDataUrl("\ud83d!")

    const [segments] = mockCreate.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
    expect(Array.from(segments[0]?.data ?? [])).toEqual([237, 160, 189, 33])

    buildQrMatrix("B")
    expect(mockCreate).toHaveBeenLastCalledWith(expect.any(Array), {
      errorCorrectionLevel: "M",
    })
  })

  it("draws QR modules onto an offscreen surface", async () => {
    await buildQrCodeDataUrl("A", { margin: 3, scale: 4 })

    expect(mockMakeOffscreen).toHaveBeenCalledWith(32, 32)
    expect(mockDrawRect).toHaveBeenCalledTimes(3)
    expect(mockDrawRect).toHaveBeenNthCalledWith(1, { x: 0, y: 0, width: 32, height: 32 }, expect.any(Object))
    expect(mockDrawRect).toHaveBeenNthCalledWith(2, { x: 12, y: 12, width: 4, height: 4 }, expect.any(Object))
    expect(mockDrawRect).toHaveBeenNthCalledWith(3, { x: 16, y: 16, width: 4, height: 4 }, expect.any(Object))
    expect(mockFlush).toHaveBeenCalledTimes(1)
    expect(mockMakeImageSnapshot).toHaveBeenCalledTimes(1)
  })

  it("strips the PNG data URL prefix", () => {
    expect(stripDataUrlPrefix("data:image/png;base64,abc123")).toBe("abc123")
    expect(stripDataUrlPrefix("plain-base64")).toBe("plain-base64")
  })
})

const mockToDataURL = jest.fn(async (_value?: unknown, _options?: unknown) => "data:image/png;base64,mock")
const mockCreate = jest.fn((_value?: unknown, _options?: unknown) => ({
  modules: {
    size: 2,
    data: [1, 0, 0, 1],
  },
}))

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toDataURL: (value: unknown, options: unknown) => mockToDataURL(value, options),
    create: (value: unknown, options: unknown) => mockCreate(value, options),
  },
}))

import { buildQrCodeDataUrl, buildQrMatrix, stripDataUrlPrefix } from "@/shared/qrcode"

describe("shared qrcode helpers", () => {
  beforeEach(() => {
    mockToDataURL.mockClear()
    mockCreate.mockClear()
  })

  it("builds QR data URLs from byte segments without mutating global TextEncoder", async () => {
    const originalTextEncoder = globalThis.TextEncoder

    await expect(buildQrCodeDataUrl("你好", { margin: 1 })).resolves.toBe("data:image/png;base64,mock")

    expect(globalThis.TextEncoder).toBe(originalTextEncoder)
    expect(mockToDataURL).toHaveBeenCalledTimes(1)

    const [segments, options] = mockToDataURL.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>, { margin: number }]
    expect(Array.isArray(segments)).toBe(true)
    expect(segments).toHaveLength(1)
    expect(segments[0]?.mode).toBe("byte")
    expect(segments[0]?.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(segments[0]?.data ?? [])).toEqual([228, 189, 160, 229, 165, 189])
    expect(options.margin).toBe(1)
  })

  it("encodes supplementary-plane characters and merges default colors", async () => {
    await buildQrCodeDataUrl("😀", {
      color: {
        dark: "#ffffff",
      },
    })

    const [segments, options] = mockToDataURL.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>, { color: { dark: string; light: string } }]
    expect(Array.from(segments[0]?.data ?? [])).toEqual([240, 159, 152, 128])
    expect(options.color).toEqual({
      dark: "#ffffff",
      light: "#FFFFFFFF",
    })
  })

  it("encodes two-byte utf8 characters", async () => {
    await buildQrCodeDataUrl("é")

    const [segments] = mockToDataURL.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
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

    const [segments] = mockToDataURL.mock.calls[0] as unknown as [Array<{ data: Uint8Array; mode: string }>]
    expect(Array.from(segments[0]?.data ?? [])).toEqual([237, 160, 189, 33])

    buildQrMatrix("B")
    expect(mockCreate).toHaveBeenLastCalledWith(expect.any(Array), {
      errorCorrectionLevel: "M",
    })
  })

  it("strips the PNG data URL prefix", () => {
    expect(stripDataUrlPrefix("data:image/png;base64,abc123")).toBe("abc123")
    expect(stripDataUrlPrefix("plain-base64")).toBe("plain-base64")
  })
})

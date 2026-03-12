import QRCode from "qrcode"

export type QrMatrix = {
  size: number
  rows: boolean[][]
}

type TextEncoderLike = {
  encode(input?: string): Uint8Array
}

function encodeUtf8(value: string) {
  const bytes: number[] = []

  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index)

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00)
        index += 1
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint)
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f))
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      )
    }
  }

  return new Uint8Array(bytes)
}

function ensureTextEncoder() {
  const globalScope = globalThis as typeof globalThis & {
    TextEncoder?: new () => TextEncoderLike
  }

  if (typeof globalScope.TextEncoder === "function") {
    return
  }

  class TextEncoderPolyfill {
    encode(input = "") {
      return encodeUtf8(String(input))
    }
  }

  globalScope.TextEncoder = TextEncoderPolyfill as unknown as typeof TextEncoder
}

export async function buildQrCodeDataUrl(value: string) {
  ensureTextEncoder()

  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#000000",
      light: "#FFFFFFFF",
    },
  })
}

export function buildQrMatrix(value: string): QrMatrix {
  ensureTextEncoder()

  const model = QRCode.create(value, {
    errorCorrectionLevel: "M",
  })
  const size = model.modules.size
  const rows: boolean[][] = []

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const row: boolean[] = []

    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      row.push(Boolean(model.modules.data[rowIndex * size + columnIndex]))
    }

    rows.push(row)
  }

  return {
    size,
    rows,
  }
}

export function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:image\/png;base64,/, "")
}

import QRCode, { type QRCodeToDataURLOptions } from "qrcode"

export type QrMatrix = {
  size: number
  rows: boolean[][]
}

type QrByteSegment = {
  data: Uint8Array
  mode: "byte"
}

const DEFAULT_QR_CODE_OPTIONS: QRCodeToDataURLOptions = {
  errorCorrectionLevel: "M",
  margin: 2,
  scale: 8,
  color: {
    dark: "#000000",
    light: "#FFFFFFFF",
  },
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

function buildQrCodeSegments(value: string): QrByteSegment[] {
  return [
    {
      data: encodeUtf8(value),
      mode: "byte",
    },
  ]
}

function mergeQrCodeOptions(options?: QRCodeToDataURLOptions): QRCodeToDataURLOptions {
  return {
    ...DEFAULT_QR_CODE_OPTIONS,
    ...options,
    color: {
      ...DEFAULT_QR_CODE_OPTIONS.color,
      ...options?.color,
    },
  }
}

export async function buildQrCodeDataUrl(value: string, options?: QRCodeToDataURLOptions) {
  return QRCode.toDataURL(buildQrCodeSegments(value), mergeQrCodeOptions(options))
}

export function buildQrMatrix(value: string, options?: Pick<QRCodeToDataURLOptions, "errorCorrectionLevel">): QrMatrix {
  const model = QRCode.create(buildQrCodeSegments(value), {
    errorCorrectionLevel: options?.errorCorrectionLevel ?? DEFAULT_QR_CODE_OPTIONS.errorCorrectionLevel,
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

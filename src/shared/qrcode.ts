import { ImageFormat, Skia } from "@shopify/react-native-skia"
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

function normalizeMargin(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_QR_CODE_OPTIONS.margin ?? 0
  }

  return Math.max(0, Math.floor(value))
}

function normalizeScale(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_QR_CODE_OPTIONS.scale ?? 1
  }

  return Math.max(1, Math.floor(value))
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
  const resolvedOptions = mergeQrCodeOptions(options)
  const matrix = buildQrMatrix(value, {
    errorCorrectionLevel: resolvedOptions.errorCorrectionLevel,
  })
  const margin = normalizeMargin(resolvedOptions.margin)
  const scale = normalizeScale(resolvedOptions.scale)
  const dimension = (matrix.size + margin * 2) * scale
  const surface = Skia.Surface.MakeOffscreen(dimension, dimension)

  if (surface === null) {
    throw new Error("Failed to create QR code surface")
  }

  const canvas = surface.getCanvas()
  const backgroundPaint = Skia.Paint()
  backgroundPaint.setAntiAlias(false)
  backgroundPaint.setColor(
    Skia.Color(resolvedOptions.color?.light ?? DEFAULT_QR_CODE_OPTIONS.color?.light ?? "#FFFFFFFF"),
  )
  canvas.drawRect(Skia.XYWHRect(0, 0, dimension, dimension), backgroundPaint)

  const foregroundPaint = Skia.Paint()
  foregroundPaint.setAntiAlias(false)
  foregroundPaint.setColor(
    Skia.Color(resolvedOptions.color?.dark ?? DEFAULT_QR_CODE_OPTIONS.color?.dark ?? "#000000"),
  )

  for (let rowIndex = 0; rowIndex < matrix.size; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < matrix.size; columnIndex += 1) {
      if (!matrix.rows[rowIndex]?.[columnIndex]) {
        continue
      }

      canvas.drawRect(
        Skia.XYWHRect((columnIndex + margin) * scale, (rowIndex + margin) * scale, scale, scale),
        foregroundPaint,
      )
    }
  }

  surface.flush()

  const image = surface.makeImageSnapshot()
  const encoded = image.encodeToBase64(ImageFormat.PNG, 100)

  if (!encoded) {
    throw new Error("Failed to encode QR code image")
  }

  return `data:image/png;base64,${encoded}`
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

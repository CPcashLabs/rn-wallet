declare module "qrcode" {
  export type QRCodeSegment = {
    data: string | Uint8Array | number[]
    mode?: "numeric" | "alphanumeric" | "byte" | "kanji"
  }

  export type QRCodeToDataURLOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H"
    margin?: number
    scale?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  const QRCode: {
    create(
      value: string | QRCodeSegment[],
      options?: QRCodeToDataURLOptions,
    ): {
      modules: {
        size: number
        data: Array<number | boolean>
      }
    }
    toDataURL(value: string | QRCodeSegment[], options?: QRCodeToDataURLOptions): Promise<string>
  }

  export default QRCode
}

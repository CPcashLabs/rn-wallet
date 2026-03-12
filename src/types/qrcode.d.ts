declare module "qrcode" {
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
      value: string,
      options?: QRCodeToDataURLOptions,
    ): {
      modules: {
        size: number
        data: Array<number | boolean>
      }
    }
    toDataURL(value: string, options?: QRCodeToDataURLOptions): Promise<string>
  }

  export default QRCode
}

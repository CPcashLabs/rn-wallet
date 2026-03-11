declare module "jsencrypt" {
  export default class JSEncrypt {
    setPublicKey(publicKey: string): void
    encrypt(text: string): string | false
  }
}

import JSEncrypt from "jsencrypt"

export function encryptByPublicKey(publicKey: string, value: string) {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)

  const encrypted = encryptor.encrypt(value)
  if (!encrypted) {
    throw new Error("PASSWORD_ENCRYPT_FAILED")
  }

  return encrypted
}

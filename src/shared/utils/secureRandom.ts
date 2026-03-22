import { Buffer } from "buffer"

export function hasSecureRandomValues() {
  return typeof globalThis.crypto?.getRandomValues === "function"
}

export function getSecureRandomBytes(size: number) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Secure random size must be a positive integer")
  }

  const cryptoObject = globalThis.crypto

  if (!cryptoObject?.getRandomValues) {
    throw new Error("crypto.getRandomValues must be defined")
  }

  const bytes = new Uint8Array(size)
  cryptoObject.getRandomValues(bytes)

  return Buffer.from(bytes)
}

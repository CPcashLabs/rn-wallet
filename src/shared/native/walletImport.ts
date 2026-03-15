import * as bip39 from "bip39"
import { Wallet } from "ethers"

export type WalletImportType = "mnemonic" | "privateKey"

export class WalletImportInputError extends Error {
  reason: "empty" | "invalid"

  constructor(reason: "empty" | "invalid", message?: string) {
    super(message ?? (reason === "empty" ? "Wallet import secret is required" : "Wallet import secret is invalid"))
    this.name = "WalletImportInputError"
    this.reason = reason
  }
}

export type ParsedWalletImport = {
  type: WalletImportType
  normalizedInput: string
  privateKey: string
  address: string
}

const PRIVATE_KEY_PATTERN = /^(0x)?[0-9a-fA-F]{64}$/
const MNEMONIC_SEPARATOR_PATTERN = /[\s,，、;；]+/g

function normalizeWhitespace(value: string) {
  return value.replace(/\u3000/g, " ").trim()
}

function normalizePrivateKey(compactInput: string) {
  const withoutPrefix = compactInput.replace(/^0x/i, "")
  return `0x${withoutPrefix.toLowerCase()}`
}

function normalizeMnemonicInput(value: string) {
  return normalizeWhitespace(value).replace(MNEMONIC_SEPARATOR_PATTERN, " ").trim().toLowerCase()
}

export function parseWalletImportInput(input: string): ParsedWalletImport {
  const trimmed = normalizeWhitespace(input)

  if (!trimmed) {
    throw new WalletImportInputError("empty")
  }

  const compactInput = trimmed.replace(/\s+/g, "")
  if (PRIVATE_KEY_PATTERN.test(compactInput)) {
    const privateKey = normalizePrivateKey(compactInput)
    const wallet = new Wallet(privateKey)

    return {
      type: "privateKey",
      normalizedInput: privateKey,
      privateKey,
      address: wallet.address,
    }
  }

  const normalizedMnemonic = normalizeMnemonicInput(trimmed)
  if (normalizedMnemonic.includes(" ")) {
    if (!bip39.validateMnemonic(normalizedMnemonic)) {
      throw new WalletImportInputError("invalid")
    }

    const wallet = Wallet.fromPhrase(normalizedMnemonic)

    return {
      type: "mnemonic",
      normalizedInput: normalizedMnemonic,
      privateKey: wallet.privateKey,
      address: wallet.address,
    }
  }

  throw new WalletImportInputError("invalid")
}

export function tryParseWalletImportInput(input: string): ParsedWalletImport | null {
  try {
    return parseWalletImportInput(input)
  } catch (error) {
    if (error instanceof WalletImportInputError) {
      return null
    }

    throw error
  }
}

export async function signMessageWithWalletImport(input: string, message: string) {
  const parsed = parseWalletImportInput(input)
  const wallet = new Wallet(parsed.privateKey)

  return {
    ...parsed,
    signature: await wallet.signMessage(message),
  }
}

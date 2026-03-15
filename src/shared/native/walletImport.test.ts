import * as bip39 from "bip39"

import { parseWalletImportInput, signMessageWithWalletImport, tryParseWalletImportInput, WalletImportInputError } from "@/shared/native/walletImport"

describe("parseWalletImportInput", () => {
  it("normalizes and parses mnemonic input", () => {
    const parsed = parseWalletImportInput("  TEST  test test test\n test test test test test test test junk  ")

    expect(parsed).toEqual({
      type: "mnemonic",
      normalizedInput: "test test test test test test test test test test test junk",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    })
  })

  it("auto-detects mnemonic input separated by punctuation", () => {
    const parsed = parseWalletImportInput("test，test、test;test；test test\ntest test test test test junk")

    expect(parsed).toEqual({
      type: "mnemonic",
      normalizedInput: "test test test test test test test test test test test junk",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    })
  })

  it("normalizes and parses private key input", () => {
    const parsed = parseWalletImportInput("  0xAC0974BEC39A17E36BA4A6B4D238FF944BACB478CBED5EFCA\nE784D7BF4F2FF80  ")

    expect(parsed).toEqual({
      type: "privateKey",
      normalizedInput: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    })
  })

  it("throws an empty-input error when the secret is blank", () => {
    try {
      parseWalletImportInput("   ")
      throw new Error("Expected parseWalletImportInput to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(WalletImportInputError)
      expect((error as WalletImportInputError).reason).toBe("empty")
    }
  })

  it("throws an invalid-input error for malformed secrets", () => {
    try {
      parseWalletImportInput("not-a-real-secret")
      throw new Error("Expected parseWalletImportInput to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(WalletImportInputError)
      expect((error as WalletImportInputError).reason).toBe("invalid")
    }
  })

  it("throws an invalid-input error for malformed mnemonic phrases", () => {
    expect(() => parseWalletImportInput("test test test")).toThrow(WalletImportInputError)
  })

  it("returns null when the secret has not formed a valid mnemonic or private key", () => {
    expect(tryParseWalletImportInput("not-a-real-secret")).toBeNull()
    expect(tryParseWalletImportInput("0x1234")).toBeNull()
  })

  it("rethrows unexpected parser failures from tryParseWalletImportInput", () => {
    const validateMnemonic = jest.spyOn(bip39, "validateMnemonic").mockImplementation(() => {
      throw new Error("unexpected")
    })

    expect(() => tryParseWalletImportInput("test test test test")).toThrow("unexpected")

    validateMnemonic.mockRestore()
  })

  it("signs a login message with an auto-detected imported wallet", async () => {
    await expect(signMessageWithWalletImport("test test test test test test test test test test test junk", "login-payload")).resolves.toEqual({
      type: "mnemonic",
      normalizedInput: "test test test test test test test test test test test junk",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      signature: "0xac70d063419a97067211f2ffa342a0547780ecc7f6dd3ecbe70555c1dfabb5de3371d776771bdeb4e027de86d7f51ee137c27dde41c1271a04ef3041e215da0d1b",
    })
  })
})

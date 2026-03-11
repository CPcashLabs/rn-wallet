import * as bip39 from "bip39"
import { Buffer } from "buffer"
import { HDKey } from "ethereum-cryptography/hdkey"
import { Wallet } from "ethers"

function assertEntropyHex(entropyHex: string) {
  if (!/^[0-9a-f]{32}$/i.test(entropyHex)) {
    throw new Error("Invalid passkey user id")
  }
}

export async function derivePasskeyWallet(entropyHex: string) {
  assertEntropyHex(entropyHex)

  const entropyBuffer = Buffer.from(entropyHex, "hex")
  const mnemonic = bip39.entropyToMnemonic(entropyBuffer)
  const seed = await bip39.mnemonicToSeed(mnemonic)
  const hdKey = HDKey.fromMasterSeed(seed)
  const derivedKey = hdKey.derive("m/44'/60'/0'/0/0")

  if (!derivedKey.privateKey) {
    throw new Error("Failed to derive passkey private key")
  }

  const privateKeyHex = `0x${Buffer.from(derivedKey.privateKey).toString("hex")}`
  const wallet = new Wallet(privateKeyHex)

  return {
    entropyHex,
    mnemonic,
    privateKeyHex,
    address: wallet.address,
  }
}

export async function createPasskeyLoginSignature(entropyHex: string) {
  const wallet = await derivePasskeyWallet(entropyHex)
  const signer = new Wallet(wallet.privateKeyHex)
  const message = {
    address: wallet.address,
    login_time: Date.now().toString(),
  }

  return {
    ...wallet,
    message,
    signature: await signer.signMessage(JSON.stringify(message)),
  }
}

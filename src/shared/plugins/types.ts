import type React from "react"

import type { AuthLoginType, UserProfile } from "@/shared/types/auth"

export type PluginId = "copouch" | "transfer" | "receive"

export type PluginRouteParamValue = string | number | boolean | null | undefined

export type PluginRouteParams = Record<string, PluginRouteParamValue>

export type PluginReturnTarget = {
  name: string
  params?: unknown
}

export type PluginPermission =
  | "auth.status.read"
  | "user.profile.read"
  | "wallet.address.read"
  | "wallet.sign"
  | "wallet.transfer"
  | "wallet.receive"

export type PluginPresentation = {
  style: "sheet" | "fullscreen"
  closeButton: "top-right"
}

export type WalletAddressDescriptor = {
  address: string
  chainId: string | null
  source: "wallet" | "profile" | "session"
}

export type SignMessageInput = {
  message: string
}

export type SignMessageResult = {
  signature: string
  address: string | null
  chainId: string | null
}

export type SignTransactionInput = {
  serializedTransaction: string
  chainId?: string | null
}

export type SignTransactionResult = {
  signedTransaction: string
}

export type TransferIntent = {
  amount?: number
  sendCoinCode?: string
  recvCoinCode?: string
  receiveAddress?: string
  metadata?: Record<string, unknown>
}

export type TransferIntentResult = {
  accepted: boolean
  orderSn?: string
  txid?: string
}

export type ReceiveIntent = {
  amount?: number
  payChain?: string
  recvCoinCode?: string
  metadata?: Record<string, unknown>
}

export type ReceiveIntentResult = {
  accepted: boolean
  orderSn?: string
  serialNumber?: string
}

export type PluginCloseResult = {
  status: "success" | "cancel" | "error"
  reason?: string
}

export interface HostApi {
  getLoginStatus(): Promise<{ loggedIn: boolean; loginType: AuthLoginType | null }>
  getUserInfo(): Promise<UserProfile | null>
  getWalletAddresses(): Promise<WalletAddressDescriptor[]>
  signMessage(input: SignMessageInput): Promise<SignMessageResult>
  signTransaction(input: SignTransactionInput): Promise<SignTransactionResult>
  createTransferIntent(input: TransferIntent): Promise<TransferIntentResult>
  createReceiveIntent(input: ReceiveIntent): Promise<ReceiveIntentResult>
  close(result?: PluginCloseResult): void
}

export type PluginContext = {
  pluginId: PluginId
  host: HostApi
  route: {
    params?: PluginRouteParams
  }
}

export type PluginEntryProps = {
  context: PluginContext
}

export type PluginEntryComponent = React.ComponentType<PluginEntryProps>

export type PluginManifest = {
  id: PluginId
  name: string
  version: string
  hostApiVersion: "1"
  permissions: PluginPermission[]
  load: () => Promise<{ default: PluginEntryComponent }>
  presentation: PluginPresentation
}

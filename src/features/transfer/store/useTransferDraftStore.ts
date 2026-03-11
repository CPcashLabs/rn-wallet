import { create } from "zustand"

import type { TransferChannel } from "@/features/transfer/services/transferApi"
import { getJson, removeItem, setJson } from "@/shared/storage/kvStorage"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"

export type TransferAddressSource = "manual" | "scan" | "recent" | "addressBook" | "suggestion"

type TransferChannelDraft = Pick<
  TransferChannel,
  | "key"
  | "channelType"
  | "receiveChainName"
  | "receiveChainFullName"
  | "receiveChainColor"
  | "receiveChainLogo"
  | "addressRegexes"
  | "title"
  | "isRebate"
>

type PersistedTransferDraft = {
  selectedChannel: TransferChannelDraft | null
  recipientAddress: string
  recipientAddressSource: TransferAddressSource | null
}

type TransferDraftState = PersistedTransferDraft & {
  setSelectedChannel: (channel: TransferChannel) => void
  setRecipientAddress: (address: string, source?: TransferAddressSource | null) => void
  clearRecipientAddress: () => void
  clearDraft: () => void
}

function readPersistedDraft(): PersistedTransferDraft {
  const stored = getJson<PersistedTransferDraft>(KvStorageKeys.TransferDraft)

  return {
    selectedChannel: stored?.selectedChannel ?? null,
    recipientAddress: stored?.recipientAddress ?? "",
    recipientAddressSource: stored?.recipientAddressSource ?? null,
  }
}

function persistDraft(payload: PersistedTransferDraft) {
  if (!payload.selectedChannel && !payload.recipientAddress) {
    removeItem(KvStorageKeys.TransferDraft)
    return
  }

  setJson(KvStorageKeys.TransferDraft, payload)
}

function toChannelDraft(channel: TransferChannel): TransferChannelDraft {
  return {
    key: channel.key,
    channelType: channel.channelType,
    receiveChainName: channel.receiveChainName,
    receiveChainFullName: channel.receiveChainFullName,
    receiveChainColor: channel.receiveChainColor,
    receiveChainLogo: channel.receiveChainLogo,
    addressRegexes: channel.addressRegexes,
    title: channel.title,
    isRebate: channel.isRebate,
  }
}

const initialState = readPersistedDraft()

export const useTransferDraftStore = create<TransferDraftState>(set => ({
  ...initialState,
  setSelectedChannel: channel =>
    set(state => {
      const nextSelectedChannel = toChannelDraft(channel)
      const shouldResetAddress = state.selectedChannel?.key && state.selectedChannel.key !== nextSelectedChannel.key
      const nextState: PersistedTransferDraft = {
        selectedChannel: nextSelectedChannel,
        recipientAddress: shouldResetAddress ? "" : state.recipientAddress,
        recipientAddressSource: shouldResetAddress ? null : state.recipientAddressSource,
      }

      persistDraft(nextState)

      return nextState
    }),
  setRecipientAddress: (address, source = null) =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        selectedChannel: state.selectedChannel,
        recipientAddress: address.trim(),
        recipientAddressSource: source,
      }

      persistDraft(nextState)

      return nextState
    }),
  clearRecipientAddress: () =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        selectedChannel: state.selectedChannel,
        recipientAddress: "",
        recipientAddressSource: null,
      }

      persistDraft(nextState)

      return nextState
    }),
  clearDraft: () => {
    removeItem(KvStorageKeys.TransferDraft)
    set({
      selectedChannel: null,
      recipientAddress: "",
      recipientAddressSource: null,
    })
  },
}))

import { create } from "zustand"

import type { TransferChannel } from "@/plugins/transfer/services/transferApi"
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
  sendAmount: string
  note: string
  selectedSendCoinCode: string
  selectedRecvCoinCode: string
  latestOrderSn: string | null
  sendHistory: Array<{
    orderSn: string
    kind: "sendCode" | "sendToken"
    createdAt: number
  }>
}

type TransferDraftState = PersistedTransferDraft & {
  setSelectedChannel: (channel: TransferChannel) => void
  setRecipientAddress: (address: string, source?: TransferAddressSource | null) => void
  setOrderDraft: (payload: { sendAmount?: string; note?: string; sendCoinCode?: string; recvCoinCode?: string }) => void
  setLatestOrderSn: (orderSn: string | null) => void
  appendSendHistory: (payload: { orderSn: string; kind: "sendCode" | "sendToken" }) => void
  clearRecipientAddress: () => void
  clearOrderDraft: () => void
  clearDraft: () => void
}

function readPersistedDraft(): PersistedTransferDraft {
  const stored = getJson<PersistedTransferDraft>(KvStorageKeys.TransferDraft)

  return {
    selectedChannel: stored?.selectedChannel ?? null,
    recipientAddress: stored?.recipientAddress ?? "",
    recipientAddressSource: stored?.recipientAddressSource ?? null,
    sendAmount: stored?.sendAmount ?? "",
    note: stored?.note ?? "",
    selectedSendCoinCode: stored?.selectedSendCoinCode ?? "",
    selectedRecvCoinCode: stored?.selectedRecvCoinCode ?? "",
    latestOrderSn: stored?.latestOrderSn ?? null,
    sendHistory: stored?.sendHistory ?? [],
  }
}

function persistDraft(payload: PersistedTransferDraft) {
  if (
    !payload.selectedChannel &&
    !payload.recipientAddress &&
    !payload.sendAmount &&
    !payload.note &&
    !payload.latestOrderSn &&
    payload.sendHistory.length === 0
  ) {
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
        sendAmount: shouldResetAddress ? "" : state.sendAmount,
        note: shouldResetAddress ? "" : state.note,
        selectedSendCoinCode: shouldResetAddress ? "" : state.selectedSendCoinCode,
        selectedRecvCoinCode: shouldResetAddress ? "" : state.selectedRecvCoinCode,
        latestOrderSn: state.latestOrderSn,
        sendHistory: state.sendHistory,
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
        sendAmount: state.sendAmount,
        note: state.note,
        selectedSendCoinCode: state.selectedSendCoinCode,
        selectedRecvCoinCode: state.selectedRecvCoinCode,
        latestOrderSn: state.latestOrderSn,
        sendHistory: state.sendHistory,
      }

      persistDraft(nextState)

      return nextState
    }),
  setOrderDraft: payload =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        ...state,
        sendAmount: payload.sendAmount ?? state.sendAmount,
        note: payload.note ?? state.note,
        selectedSendCoinCode: payload.sendCoinCode ?? state.selectedSendCoinCode,
        selectedRecvCoinCode: payload.recvCoinCode ?? state.selectedRecvCoinCode,
      }

      persistDraft(nextState)

      return nextState
    }),
  setLatestOrderSn: latestOrderSn =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        ...state,
        latestOrderSn,
      }

      persistDraft(nextState)

      return nextState
    }),
  appendSendHistory: payload =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        ...state,
        latestOrderSn: payload.orderSn,
        sendHistory: [
          {
            orderSn: payload.orderSn,
            kind: payload.kind,
            createdAt: Date.now(),
          },
          ...state.sendHistory.filter(item => item.orderSn !== payload.orderSn),
        ].slice(0, 20),
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
        sendAmount: state.sendAmount,
        note: state.note,
        selectedSendCoinCode: state.selectedSendCoinCode,
        selectedRecvCoinCode: state.selectedRecvCoinCode,
        latestOrderSn: state.latestOrderSn,
        sendHistory: state.sendHistory,
      }

      persistDraft(nextState)

      return nextState
    }),
  clearOrderDraft: () =>
    set(state => {
      const nextState: PersistedTransferDraft = {
        ...state,
        sendAmount: "",
        note: "",
        selectedSendCoinCode: "",
        selectedRecvCoinCode: "",
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
      sendAmount: "",
      note: "",
      selectedSendCoinCode: "",
      selectedRecvCoinCode: "",
      latestOrderSn: null,
      sendHistory: [],
    })
  },
}))

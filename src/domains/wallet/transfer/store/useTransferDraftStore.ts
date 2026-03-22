import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { TransferChannel } from "@/domains/wallet/transfer/services/transferApi"
import { KvStorageKeys } from "@/shared/storage/sessionKeys"
import { createKvJsonStorage } from "@/shared/store/persistStorage"

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

function createEmptyPersistedTransferDraft(): PersistedTransferDraft {
  return {
    selectedChannel: null,
    recipientAddress: "",
    recipientAddressSource: null,
    sendAmount: "",
    note: "",
    selectedSendCoinCode: "",
    selectedRecvCoinCode: "",
    latestOrderSn: null,
    sendHistory: [],
  }
}

function normalizePersistedTransferDraft(stored?: Partial<PersistedTransferDraft> | null): PersistedTransferDraft {
  const emptyDraft = createEmptyPersistedTransferDraft()

  return {
    selectedChannel: stored?.selectedChannel ?? emptyDraft.selectedChannel,
    recipientAddress: stored?.recipientAddress ?? emptyDraft.recipientAddress,
    recipientAddressSource: stored?.recipientAddressSource ?? emptyDraft.recipientAddressSource,
    sendAmount: stored?.sendAmount ?? emptyDraft.sendAmount,
    note: stored?.note ?? emptyDraft.note,
    selectedSendCoinCode: stored?.selectedSendCoinCode ?? emptyDraft.selectedSendCoinCode,
    selectedRecvCoinCode: stored?.selectedRecvCoinCode ?? emptyDraft.selectedRecvCoinCode,
    latestOrderSn: stored?.latestOrderSn ?? emptyDraft.latestOrderSn,
    sendHistory: stored?.sendHistory ?? emptyDraft.sendHistory,
  }
}

function shouldRemovePersistedTransferDraft(payload: PersistedTransferDraft) {
  if (
    !payload.selectedChannel &&
    !payload.recipientAddress &&
    !payload.sendAmount &&
    !payload.note &&
    !payload.latestOrderSn &&
    payload.sendHistory.length === 0
  ) {
    return true
  }

  return false
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

function selectPersistedTransferDraft(state: TransferDraftState): PersistedTransferDraft {
  return {
    selectedChannel: state.selectedChannel,
    recipientAddress: state.recipientAddress,
    recipientAddressSource: state.recipientAddressSource,
    sendAmount: state.sendAmount,
    note: state.note,
    selectedSendCoinCode: state.selectedSendCoinCode,
    selectedRecvCoinCode: state.selectedRecvCoinCode,
    latestOrderSn: state.latestOrderSn,
    sendHistory: state.sendHistory,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export const useTransferDraftStore = create<TransferDraftState>()(
  persist(
    set => ({
      ...createEmptyPersistedTransferDraft(),
      setSelectedChannel: channel =>
        set(state => {
          const nextSelectedChannel = toChannelDraft(channel)
          const shouldResetAddress = state.selectedChannel?.key && state.selectedChannel.key !== nextSelectedChannel.key

          return {
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
        }),
      setRecipientAddress: (address, source = null) =>
        set(state => ({
          selectedChannel: state.selectedChannel,
          recipientAddress: address.trim(),
          recipientAddressSource: source,
          sendAmount: state.sendAmount,
          note: state.note,
          selectedSendCoinCode: state.selectedSendCoinCode,
          selectedRecvCoinCode: state.selectedRecvCoinCode,
          latestOrderSn: state.latestOrderSn,
          sendHistory: state.sendHistory,
        })),
      setOrderDraft: payload =>
        set(state => ({
          ...selectPersistedTransferDraft(state),
          sendAmount: payload.sendAmount ?? state.sendAmount,
          note: payload.note ?? state.note,
          selectedSendCoinCode: payload.sendCoinCode ?? state.selectedSendCoinCode,
          selectedRecvCoinCode: payload.recvCoinCode ?? state.selectedRecvCoinCode,
        })),
      setLatestOrderSn: latestOrderSn =>
        set(state => ({
          ...selectPersistedTransferDraft(state),
          latestOrderSn,
        })),
      appendSendHistory: payload =>
        set(state => ({
          ...selectPersistedTransferDraft(state),
          latestOrderSn: payload.orderSn,
          sendHistory: [
            {
              orderSn: payload.orderSn,
              kind: payload.kind,
              createdAt: Date.now(),
            },
            ...state.sendHistory.filter(item => item.orderSn !== payload.orderSn),
          ].slice(0, 20),
        })),
      clearRecipientAddress: () =>
        set(state => ({
          selectedChannel: state.selectedChannel,
          recipientAddress: "",
          recipientAddressSource: null,
          sendAmount: state.sendAmount,
          note: state.note,
          selectedSendCoinCode: state.selectedSendCoinCode,
          selectedRecvCoinCode: state.selectedRecvCoinCode,
          latestOrderSn: state.latestOrderSn,
          sendHistory: state.sendHistory,
        })),
      clearOrderDraft: () =>
        set(state => ({
          ...selectPersistedTransferDraft(state),
          sendAmount: "",
          note: "",
          selectedSendCoinCode: "",
          selectedRecvCoinCode: "",
        })),
      clearDraft: () => set(createEmptyPersistedTransferDraft()),
    }),
    {
      name: KvStorageKeys.TransferDraft,
      storage: createKvJsonStorage<PersistedTransferDraft>({
        migrateLegacy: raw => {
          if (!isRecord(raw)) {
            return null
          }

          return normalizePersistedTransferDraft(raw as Partial<PersistedTransferDraft>)
        },
        shouldRemove: shouldRemovePersistedTransferDraft,
      }),
      partialize: state => selectPersistedTransferDraft(state),
    },
  ),
)

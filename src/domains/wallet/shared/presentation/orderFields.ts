import { formatAmount } from "@/shared/exchange/utils/order"

import type { ReceiveShareDetail } from "@/domains/wallet/receive/services/receiveApi"
import type { SendShareDetail, TransferOrderDetail } from "@/domains/wallet/transfer/services/transferApi"
import { formatWalletDateTime } from "@/domains/wallet/shared/utils/format"

type Translator = (key: string, options?: Record<string, unknown>) => string

export type WalletDisplayField = {
  label: string
  value: string
}

export type TransferShareDisplayFields = {
  orderSn: WalletDisplayField
  shareAmount: WalletDisplayField
  shareUrl: WalletDisplayField
  receiveAddress: WalletDisplayField
  paymentAddress: WalletDisplayField
  orderType: WalletDisplayField
  status: WalletDisplayField
  expiredAt: WalletDisplayField
}

export type ReceiveShareDisplayFields = {
  orderSn: WalletDisplayField
  address: WalletDisplayField
  shareUrl: WalletDisplayField
}

export type TransferStatusDisplayFields = {
  receiveAmount: WalletDisplayField
  paymentMethod: WalletDisplayField
  arrival: WalletDisplayField
  txid: WalletDisplayField
  orderType: WalletDisplayField
}

function fallbackText(value: string | number | null | undefined, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback
  }

  const text = String(value).trim()
  return text.length > 0 ? text : fallback
}

function resolveStatusText(detail: Partial<Pick<SendShareDetail, "statusName" | "status">> | null | undefined) {
  if (detail?.statusName?.trim()) {
    return detail.statusName
  }

  if (detail?.status !== null && detail?.status !== undefined) {
    return String(detail.status)
  }

  return "-"
}

function resolveAmountText(amount: number | null | undefined, primaryAsset?: string, secondaryAsset?: string) {
  const asset = primaryAsset?.trim() || secondaryAsset?.trim() || ""
  const amountText = String(amount ?? 0)
  return asset ? `${amountText} ${asset}` : amountText
}

export function mapWalletTransferShareFields(
  t: Translator,
  detail: Partial<SendShareDetail> | null | undefined,
  fallbackOrderSn: string,
): TransferShareDisplayFields {
  return {
    orderSn: {
      label: t("transfer.send.orderSn"),
      value: fallbackText(detail?.orderSn || fallbackOrderSn),
    },
    shareAmount: {
      label: t("transfer.send.shareAmount"),
      value: resolveAmountText(detail?.sendAmount, detail?.sendCoinName, detail?.sendCoinCode),
    },
    shareUrl: {
      label: t("transfer.send.shareUrl"),
      value: fallbackText(detail?.shareUrl),
    },
    receiveAddress: {
      label: t("transfer.send.receiveAddress"),
      value: fallbackText(detail?.receiveAddress),
    },
    paymentAddress: {
      label: t("transfer.send.paymentAddress"),
      value: fallbackText(detail?.paymentAddress),
    },
    orderType: {
      label: t("transfer.send.orderType"),
      value: fallbackText(detail?.orderType),
    },
    status: {
      label: t("transfer.send.status"),
      value: resolveStatusText(detail),
    },
    expiredAt: {
      label: t("transfer.send.expiredAt"),
      value: detail?.expiredAt ? formatWalletDateTime(detail.expiredAt) : "-",
    },
  }
}

export function mapWalletReceiveShareFields(
  t: Translator,
  detail: Partial<ReceiveShareDetail> | null | undefined,
  fallbackOrderSn: string,
): ReceiveShareDisplayFields {
  return {
    orderSn: {
      label: "Order SN",
      value: fallbackText(detail?.orderSn || fallbackOrderSn),
    },
    address: {
      label: t("receive.share.address"),
      value: fallbackText(detail?.address),
    },
    shareUrl: {
      label: t("receive.share.link"),
      value: fallbackText(detail?.shareUrl),
    },
  }
}

export function mapWalletTransferStatusFields(
  t: Translator,
  detail: Partial<TransferOrderDetail> | null | undefined,
  input?: { publicTxid?: string },
): TransferStatusDisplayFields {
  return {
    receiveAmount: {
      label: t("transfer.status.receiveAmount"),
      value: `${formatAmount(detail?.recvActualAmount || detail?.recvAmount || 0)} ${detail?.recvCoinName || detail?.recvCoinCode || ""}`.trim(),
    },
    paymentMethod: {
      label: t("transfer.status.paymentMethod"),
      value: detail?.multisigWalletId ? t("transfer.confirm.copouch") : t("transfer.confirm.balance"),
    },
    arrival: {
      label: t("transfer.status.arrival"),
      value: detail?.sellerEstimateReceiveAt ? formatWalletDateTime(detail.sellerEstimateReceiveAt) : fallbackText(detail?.recvChainName),
    },
    txid: {
      label: t("transfer.status.txid"),
      value: fallbackText(detail?.txid || input?.publicTxid),
    },
    orderType: {
      label: t("transfer.status.orderType"),
      value: fallbackText(detail?.orderType),
    },
  }
}

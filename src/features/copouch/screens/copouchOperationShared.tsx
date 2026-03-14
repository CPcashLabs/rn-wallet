import React, { useCallback, useState } from "react"

import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  getCopouchDetail,
  getCopouchOwners,
  type CopouchBillItem,
  type CopouchDetail,
  type CopouchEvent,
  type CopouchOwner,
} from "@/features/copouch/services/copouchApi"
import { PageEmpty, SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAmount } from "@/features/transfer/utils/order"
import { ApiError } from "@/shared/errors"
import { resolveErrorMessage } from "@/shared/errors/presentation"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export const bgPalette: Record<number, { card: string; page: string }> = {
  1: { card: "#DFF6F4", page: "#F4FBFA" },
  2: { card: "#FFF1D6", page: "#FFFBF2" },
  3: { card: "#E8EEFF", page: "#F6F8FF" },
  4: { card: "#FCE7F3", page: "#FFF5FA" },
}

export const billFilters = [
  { key: "all", titleKey: "copouch.bill.filters.all", orderTypeList: undefined },
  { key: "withdraw", titleKey: "copouch.bill.filters.withdraw", orderTypeList: ["PAYMENT_NORMAL"] },
  { key: "deposit", titleKey: "copouch.bill.filters.deposit", orderTypeList: ["RECEIPT_NORMAL"] },
  { key: "receive", titleKey: "copouch.bill.filters.receive", orderTypeList: ["RECEIPT"] },
  { key: "transfer", titleKey: "copouch.bill.filters.transfer", orderTypeList: ["PAYMENT"] },
] as const

export function isEvmAddress(value: string) {
  return /^(0x|0X)?[a-fA-F0-9]{40}$/.test(value.trim())
}

export function normalizeWalletAddress(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed : `0x${trimmed}`
}

export function groupOwners(owners: CopouchOwner[]) {
  return {
    creators: owners.filter(owner => owner.isCreator),
    members: owners.filter(owner => !owner.isCreator),
  }
}

export function resolveMemberBadgeKey(status: number) {
  switch (status) {
    case 0:
      return "copouch.member.badges.invited"
    case 2:
      return "copouch.member.badges.removing"
    default:
      return ""
  }
}

export function resolveMutationMessage(
  t: ReturnType<typeof useTranslation>["t"],
  error: unknown,
  mode: "add" | "remove",
) {
  return resolveErrorMessage(t, error, {
    fallbackKey: mode === "add" ? "copouch.member.errors.addFailed" : "copouch.member.errors.removeFailed",
    codeMap: {
      "40004": "copouch.member.errors.ownerLimit",
      "40005": mode === "add" ? "copouch.member.errors.alreadyOwner" : "copouch.member.errors.notOwner",
      "40006": "copouch.member.errors.notOwner",
      "404": "copouch.member.errors.addressMissing",
    },
    preferApiMessage: false,
    customResolver: currentError => {
      if (currentError instanceof Error && /wallet limit/i.test(currentError.message)) {
        return t("copouch.member.errors.ownerLimit")
      }

      return undefined
    },
  })
}

export function resolveEventMessage(t: ReturnType<typeof useTranslation>["t"], item: CopouchEvent) {
  switch (item.eventType) {
    case "ADDED_OWNER":
      return t("copouch.remind.messages.addedOwner", {
        operator: item.operatorUserName || t("copouch.remind.unknown"),
        target: item.targetUserName || t("copouch.remind.unknown"),
      })
    case "REMOVED_OWNER":
      return t("copouch.remind.messages.removedOwner", {
        operator: item.operatorUserName || t("copouch.remind.unknown"),
        target: item.targetUserName || t("copouch.remind.unknown"),
      })
    case "PROXY_CREATION":
      return t("copouch.remind.messages.createdWallet", {
        operator: item.operatorUserName || t("copouch.remind.unknown"),
      })
    default:
      return item.messageContent || t("copouch.remind.messages.fallback")
  }
}

export function resolveBillAmount(item: CopouchBillItem) {
  const isIncoming = item.orderType === "RECEIPT" || item.orderType === "RECEIPT_NORMAL"
  const amount = isIncoming ? item.recvActualAmount || item.recvAmount : item.sendActualAmount || item.sendAmount
  const symbol = isIncoming ? item.recvCoinName : item.sendCoinName
  return {
    label: `${isIncoming ? "+" : "-"} ${formatAmount(amount)} ${symbol}`.trim(),
    incoming: isIncoming,
  }
}

export function resolveBillCounterparty(item: CopouchBillItem) {
  return item.receiveAddress || item.paymentAddress || item.transferAddress || item.walletAddress
}

export function resolveTransactionTitle(
  t: ReturnType<typeof useTranslation>["t"],
  transactionType: number,
  orderType: string,
) {
  if (transactionType === 1 || transactionType === 2) {
    return t("copouch.allocation.expenseTitle")
  }

  if (transactionType === 3 || transactionType === 4) {
    return t("copouch.allocation.incomeTitle")
  }

  switch (orderType) {
    case "PAYMENT_NORMAL":
      return t("copouch.bill.filters.withdraw")
    case "RECEIPT_NORMAL":
      return t("copouch.bill.filters.deposit")
    case "RECEIPT":
      return t("copouch.bill.filters.receive")
    case "PAYMENT":
      return t("copouch.bill.filters.transfer")
    default:
      return orderType || "-"
  }
}

export function LoadingCard(props: { body: string }) {
  const theme = useAppTheme()

  return (
    <SectionCard>
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{props.body}</Text>
      </View>
    </SectionCard>
  )
}

export function AvatarBadge(props: { label: string; sublabel?: string; avatarText: string; accent?: string }) {
  const theme = useAppTheme()
  const accent = props.accent ?? theme.colors.primary

  return (
    <View style={styles.avatarBadge}>
      <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
        <Text style={styles.avatarCircleText}>{props.avatarText}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.avatarLabel, { color: theme.colors.text }]}>
        {props.label}
      </Text>
      {props.sublabel ? (
        <Text numberOfLines={1} style={[styles.avatarSublabel, { color: theme.colors.mutedText }]}>
          {props.sublabel}
        </Text>
      ) : null}
    </View>
  )
}

export function StatusBadge(props: { label: string; tone?: "success" | "warning" | "neutral" }) {
  const theme = useAppTheme()
  const palette =
    props.tone === "success"
      ? { background: "#E8F7EE", border: "#9BD2AF", text: "#177245" }
      : props.tone === "warning"
        ? { background: "#FFF4E5", border: "#F0BF7A", text: "#A75A00" }
        : { background: theme.colors.surface, border: theme.colors.border, text: theme.colors.mutedText }

  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Text style={[styles.statusBadgeText, { color: palette.text }]}>{props.label}</Text>
    </View>
  )
}

export function WalletGuard(props: {
  loading: boolean
  invalidAccess: boolean
  invalidTitle: string
  invalidBody: string
  loadingBody: string
  children: React.ReactNode
}) {
  if (props.loading) {
    return <LoadingCard body={props.loadingBody} />
  }

  if (props.invalidAccess) {
    return <PageEmpty title={props.invalidTitle} body={props.invalidBody} />
  }

  return <>{props.children}</>
}

export function useCopouchWalletDetail(id: string) {
  const [detail, setDetail] = useState<CopouchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await getCopouchDetail(id)
      setDetail(response)
      setInvalidAccess(false)
      return response
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setInvalidAccess(true)
        setDetail(null)
        return null
      }

      throw error
    } finally {
      setLoading(false)
    }
  }, [id])

  return { detail, loading, invalidAccess, reload: load, setDetail }
}

export async function loadCopouchOwnersWithGuard(id: string, onForbidden: () => void) {
  try {
    return await getCopouchOwners(id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      onForbidden()
      return []
    }

    throw error
  }
}

export const styles = StyleSheet.create({
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickCell: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D4D4D8",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickEmoji: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  memberList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  avatarBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  avatarSublabel: {
    fontSize: 12,
    flexShrink: 1,
  },
  statusBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inlineAction: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#93C5FD",
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  disabledAction: {
    opacity: 0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  textInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  walletHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  walletHeroSub: {
    fontSize: 13,
    color: "#475569",
  },
  avatarRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  paletteColumn: {
    gap: 12,
  },
  backgroundCard: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  backgroundCardText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerAction: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  eventRow: {
    flexDirection: "row",
    gap: 12,
  },
  eventAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  eventAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  eventContent: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  assetList: {
    gap: 14,
  },
  memberStatCard: {
    gap: 10,
  },
  statTriplet: {
    gap: 6,
  },
  destinationCard: {
    minHeight: 64,
    justifyContent: "center",
  },
  allocationAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
})

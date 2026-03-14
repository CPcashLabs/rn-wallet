import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import type { CowalletStackParamList } from "@/app/navigation/types"
import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import { formatAddress, formatCurrency, formatDateTime, formatTokenAmount } from "@/features/home/utils/format"
import { ActionRow, FilterChip, SummaryGrid } from "@/features/orders/components/OrdersUi"
import { getOrderDetail } from "@/features/orders/services/ordersApi"
import {
  addCopouchOwner,
  exportCopouchBill,
  getCopouchAssetBreakdown,
  getCopouchBillList,
  getCopouchBillStatistics,
  getCopouchDetail,
  getCopouchMemberAccountList,
  getCopouchOwners,
  getCopouchOwnersIgnoreDelete,
  getCopouchReallocateInfo,
  getCopouchWalletEvents,
  markAllCopouchEventsRead,
  preValidateCopouchAddOwner,
  preValidateCopouchRemoveOwner,
  reallocateCopouchMember,
  removeCopouchOwner,
  syncCopouchOwners,
  updateCopouchWallet,
  type CopouchAssetItem,
  type CopouchBillItem,
  type CopouchBillStatistics,
  type CopouchDetail,
  type CopouchEvent,
  type CopouchMemberAccount,
  type CopouchOwner,
  type CopouchReallocateCandidate,
  type CopouchReallocateInfo,
} from "@/features/copouch/services/copouchApi"
import { useCowalletStore } from "@/features/copouch/store/useCowalletStore"
import {
  createBridgeTransferOrder,
  createNormalTransferOrder,
} from "@/features/transfer/services/transferOrderApi"
import {
  getTransferChannels,
  getTransferGasEstimate,
  getTransferOrderOptions,
  getTransferQuote,
  type TransferChannel,
  type TransferOrderOption,
} from "@/features/transfer/services/transferApi"
import { FieldRow, PageEmpty, PrimaryButton, SecondaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAmount, parseDecimalInput } from "@/features/transfer/utils/order"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { ApiError } from "@/shared/errors"
import { useBalanceStore } from "@/shared/store/useBalanceStore"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useUserStore } from "@/shared/store/useUserStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type StackProps<T extends keyof CowalletStackParamList> = NativeStackScreenProps<CowalletStackParamList, T>
type TransferMode = "withdraw" | "deposit"

const bgPalette: Record<number, { card: string; page: string }> = {
  1: { card: "#DFF6F4", page: "#F4FBFA" },
  2: { card: "#FFF1D6", page: "#FFFBF2" },
  3: { card: "#E8EEFF", page: "#F6F8FF" },
  4: { card: "#FCE7F3", page: "#FFF5FA" },
}

const billFilters = [
  { key: "all", titleKey: "copouch.bill.filters.all", orderTypeList: undefined },
  { key: "withdraw", titleKey: "copouch.bill.filters.withdraw", orderTypeList: ["PAYMENT_NORMAL"] },
  { key: "deposit", titleKey: "copouch.bill.filters.deposit", orderTypeList: ["RECEIPT_NORMAL"] },
  { key: "receive", titleKey: "copouch.bill.filters.receive", orderTypeList: ["RECEIPT"] },
  { key: "transfer", titleKey: "copouch.bill.filters.transfer", orderTypeList: ["PAYMENT"] },
] as const

function isEvmAddress(value: string) {
  return /^(0x|0X)?[a-fA-F0-9]{40}$/.test(value.trim())
}

function normalizeWalletAddress(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  return trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed : `0x${trimmed}`
}

function groupOwners(owners: CopouchOwner[]) {
  return {
    creators: owners.filter(owner => owner.isCreator),
    members: owners.filter(owner => !owner.isCreator),
  }
}

function resolveMemberBadgeKey(status: number) {
  switch (status) {
    case 0:
      return "copouch.member.badges.invited"
    case 2:
      return "copouch.member.badges.removing"
    default:
      return ""
  }
}

function resolveMutationMessage(
  t: ReturnType<typeof useTranslation>["t"],
  error: unknown,
  mode: "add" | "remove",
) {
  if (error instanceof ApiError) {
    switch (String(error.code ?? "")) {
      case "40005":
        return mode === "add" ? t("copouch.member.errors.alreadyOwner") : t("copouch.member.errors.notOwner")
      case "40004":
        return t("copouch.member.errors.ownerLimit")
      case "40006":
        return t("copouch.member.errors.notOwner")
      case "404":
        return t("copouch.member.errors.addressMissing")
      default:
        return mode === "add" ? t("copouch.member.errors.addFailed") : t("copouch.member.errors.removeFailed")
    }
  }

  if (error instanceof Error && /wallet limit/i.test(error.message)) {
    return t("copouch.member.errors.ownerLimit")
  }

  return mode === "add" ? t("copouch.member.errors.addFailed") : t("copouch.member.errors.removeFailed")
}

function resolveEventMessage(t: ReturnType<typeof useTranslation>["t"], item: CopouchEvent) {
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

function resolveBillAmount(item: CopouchBillItem) {
  const isIncoming = item.orderType === "RECEIPT" || item.orderType === "RECEIPT_NORMAL"
  const amount = isIncoming ? item.recvActualAmount || item.recvAmount : item.sendActualAmount || item.sendAmount
  const symbol = isIncoming ? item.recvCoinName : item.sendCoinName
  return {
    label: `${isIncoming ? "+" : "-"} ${formatAmount(amount)} ${symbol}`.trim(),
    incoming: isIncoming,
  }
}

function resolveBillCounterparty(item: CopouchBillItem) {
  return item.receiveAddress || item.paymentAddress || item.transferAddress || item.walletAddress
}

function resolveTransactionTitle(
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

function LoadingCard(props: { body: string }) {
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

function AvatarBadge(props: { label: string; sublabel?: string; avatarText: string; accent?: string }) {
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

function StatusBadge(props: { label: string; tone?: "success" | "warning" | "neutral" }) {
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

function WalletGuard(props: {
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

function useCopouchWalletDetail(id: string) {
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

async function loadCopouchOwnersWithGuard(id: string, onForbidden: () => void) {
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

export function CowalletMemberScreen({ navigation, route }: StackProps<"CowalletMemberScreen">) {
  const { t } = useTranslation()
  const lastEvent = useSocketStore(state => state.lastEvent)
  const { detail, loading, invalidAccess, reload, setDetail } = useCopouchWalletDetail(route.params.id)
  const [owners, setOwners] = useState<CopouchOwner[]>([])
  const [ownersLoading, setOwnersLoading] = useState(true)

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true)
    try {
      const nextOwners = await loadCopouchOwnersWithGuard(route.params.id, () => setDetail(null))
      setOwners(nextOwners)
    } finally {
      setOwnersLoading(false)
    }
  }, [route.params.id, setDetail])

  const loadAll = useCallback(async () => {
    const [walletDetail] = await Promise.all([reload(), loadOwners()])
    return walletDetail
  }, [loadOwners, reload])

  useEffect(() => {
    void loadAll().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.member.loadFailed"))
    })
  }, [loadAll, t])

  useFocusEffect(
    React.useCallback(() => {
      void loadAll().catch(() => null)
    }, [loadAll]),
  )

  useEffect(() => {
    if (!lastEvent?.type) {
      return
    }

    if (["MultisigWalletMemberAddSuc", "MultisigWalletMemberDelSuc", "MultisigWalletMemberRemoved"].includes(lastEvent.type)) {
      void loadAll().catch(() => null)
    }
  }, [lastEvent, loadAll])

  const groups = useMemo(() => groupOwners(owners), [owners])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.title")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading || ownersLoading}
        loadingBody={t("copouch.member.loading")}
      >
        {detail?.isCreator ? (
          <SectionCard>
            <View style={styles.quickRow}>
              <Pressable style={styles.quickCell} onPress={() => navigation.navigate("CowalletAddMemberScreen", { id: route.params.id })}>
                <Text style={styles.quickEmoji}>+</Text>
                <Text style={styles.quickLabel}>{t("copouch.member.addAction")}</Text>
              </Pressable>
              <Pressable style={styles.quickCell} onPress={() => navigation.navigate("CowalletDeleteMemberScreen", { id: route.params.id })}>
                <Text style={styles.quickEmoji}>-</Text>
                <Text style={styles.quickLabel}>{t("copouch.member.deleteAction")}</Text>
              </Pressable>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.member.creator")}</Text>
          <View style={styles.memberList}>
            {groups.creators.map(owner => (
              <View key={owner.userId || owner.walletAddress} style={styles.memberRow}>
                <AvatarBadge
                  accent="#0EA5E9"
                  avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                  label={owner.nickname || t("copouch.member.unknown")}
                  sublabel={formatAddress(owner.walletAddress)}
                />
                <StatusBadge label={t("copouch.member.creatorBadge")} tone="neutral" />
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.member.members")}</Text>
          {groups.members.length === 0 ? (
            <PageEmpty title={t("copouch.member.emptyTitle")} body={t("copouch.member.emptyBody")} />
          ) : (
            <View style={styles.memberList}>
              {groups.members.map(owner => {
                const badgeKey = resolveMemberBadgeKey(owner.status)
                return (
                  <View key={owner.userId || owner.walletAddress} style={styles.memberRow}>
                    <AvatarBadge
                      avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                      label={owner.nickname || t("copouch.member.unknown")}
                      sublabel={formatAddress(owner.walletAddress)}
                    />
                    {badgeKey ? <StatusBadge label={t(badgeKey)} tone={owner.status === 2 ? "warning" : "success"} /> : null}
                  </View>
                )
              })}
            </View>
          )}
        </SectionCard>
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletDeleteMemberScreen({ navigation, route }: StackProps<"CowalletDeleteMemberScreen">) {
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload, setDetail } = useCopouchWalletDetail(route.params.id)
  const [owners, setOwners] = useState<CopouchOwner[]>([])
  const [ownersLoading, setOwnersLoading] = useState(true)
  const [deletingWalletAddress, setDeletingWalletAddress] = useState("")

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true)
    try {
      const nextOwners = await loadCopouchOwnersWithGuard(route.params.id, () => setDetail(null))
      setOwners(nextOwners)
    } finally {
      setOwnersLoading(false)
    }
  }, [route.params.id, setDetail])

  const loadAll = useCallback(async () => {
    await Promise.all([reload(), loadOwners()])
  }, [loadOwners, reload])

  useEffect(() => {
    void loadAll().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.member.loadFailed"))
    })
  }, [loadAll, t])

  const members = useMemo(() => owners.filter(owner => !owner.isCreator), [owners])

  const confirmDelete = useCallback(
    (owner: CopouchOwner) => {
      Alert.alert(t("copouch.member.deleteConfirmTitle"), t("copouch.member.deleteConfirmBody", { name: owner.nickname || formatAddress(owner.walletAddress) }), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeletingWalletAddress(owner.walletAddress)
              try {
                await preValidateCopouchRemoveOwner(route.params.id, owner.walletAddress)
                await removeCopouchOwner(route.params.id, { walletAddress: owner.walletAddress })
                await loadAll()
                Alert.alert(t("common.infoTitle"), t("copouch.member.removeSuccess"))
              } catch (error) {
                try {
                  await syncCopouchOwners(route.params.id)
                  await loadAll()
                } catch {
                  // ignore sync errors and surface the original mutation error
                }

                Alert.alert(t("common.errorTitle"), resolveMutationMessage(t, error, "remove"))
              } finally {
                setDeletingWalletAddress("")
              }
            })()
          },
        },
      ])
    },
    [loadAll, route.params.id, t],
  )

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.deleteTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading || ownersLoading}
        loadingBody={t("copouch.member.loading")}
      >
        {!detail?.isCreator ? (
          <PageEmpty title={t("copouch.member.creatorOnlyTitle")} body={t("copouch.member.creatorOnlyBody")} />
        ) : members.length === 0 ? (
          <PageEmpty title={t("copouch.member.emptyTitle")} body={t("copouch.member.emptyBody")} />
        ) : (
          <SectionCard>
            <View style={styles.memberList}>
              {members.map(owner => {
                const badgeKey = resolveMemberBadgeKey(owner.status)
                const deleting = deletingWalletAddress === owner.walletAddress

                return (
                  <View key={owner.userId || owner.walletAddress} style={styles.memberRow}>
                    <AvatarBadge
                      avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                      label={owner.nickname || t("copouch.member.unknown")}
                      sublabel={formatAddress(owner.walletAddress)}
                    />
                    {owner.status === 1 ? (
                      <Pressable disabled={deleting} onPress={() => confirmDelete(owner)} style={[styles.inlineAction, deleting && styles.disabledAction]}>
                        <Text style={styles.inlineActionText}>{deleting ? t("common.loading") : t("copouch.member.deleteAction")}</Text>
                      </Pressable>
                    ) : badgeKey ? (
                      <StatusBadge label={t(badgeKey)} tone={owner.status === 2 ? "warning" : "success"} />
                    ) : null}
                  </View>
                )
              })}
            </View>
          </SectionCard>
        )}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletAddMemberScreen({ navigation, route }: StackProps<"CowalletAddMemberScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [walletAddress, setWalletAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void reload().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.member.loadFailed"))
    })
  }, [reload, t])

  const normalizedAddress = normalizeWalletAddress(walletAddress)
  const validationMessage = useMemo(() => {
    if (!normalizedAddress) {
      return t("copouch.member.errors.addressRequired")
    }

    return isEvmAddress(normalizedAddress) ? "" : t("copouch.member.errors.addressInvalid")
  }, [normalizedAddress, t])

  const handleSubmit = async (address: string) => {
    if (validationMessage) {
      Alert.alert(t("common.infoTitle"), validationMessage)
      return
    }

    setSubmitting(true)

    try {
      await preValidateCopouchAddOwner(route.params.id, address)
      await addCopouchOwner(route.params.id, { walletAddress: address })
      Alert.alert(t("common.infoTitle"), t("copouch.member.addSuccess"))
      navigation.goBack()
    } catch (error) {
      Alert.alert(t("common.errorTitle"), resolveMutationMessage(t, error, "add"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.addTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.member.loading")}
      >
        {!detail?.isCreator ? (
          <PageEmpty title={t("copouch.member.creatorOnlyTitle")} body={t("copouch.member.creatorOnlyBody")} />
        ) : (
          <>
            <SectionCard>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.member.walletAddressLabel")}</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setWalletAddress}
                placeholder={t("copouch.member.walletAddressPlaceholder")}
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={walletAddress}
              />
              <Text style={[styles.helperText, { color: validationMessage ? "#DC2626" : theme.colors.mutedText }]}>
                {validationMessage || t("copouch.member.addressHint")}
              </Text>
            </SectionCard>

            <SectionCard>
              <ActionRow
                body={t("copouch.member.teamImportBody")}
                label={t("copouch.member.teamImportTitle")}
                onPress={() => navigation.navigate("CowalletAddMemberForTeamScreen", { id: route.params.id })}
              />
            </SectionCard>

            <PrimaryButton
              disabled={Boolean(validationMessage) || submitting}
              label={submitting ? t("common.loading") : t("copouch.member.addAction")}
              onPress={() => void handleSubmit(normalizedAddress)}
            />
          </>
        )}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletAddMemberForTeamScreen({ navigation, route }: StackProps<"CowalletAddMemberForTeamScreen">) {
  const { t } = useTranslation()
  const wallets = useCowalletStore(state => state.wallets)
  const loading = useCowalletStore(state => state.loading)
  const loadOverview = useCowalletStore(state => state.loadOverview)
  const { invalidAccess, loading: detailLoading, reload } = useCopouchWalletDetail(route.params.id)

  useEffect(() => {
    void reload().catch(() => null)
    if (wallets.length === 0) {
      void loadOverview().catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.member.teamLoadFailed"))
      })
    }
  }, [loadOverview, reload, t, wallets.length])

  const otherWallets = useMemo(
    () => wallets.filter(wallet => wallet.id !== route.params.id && wallet.isCreator),
    [route.params.id, wallets],
  )

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.teamImportTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading || detailLoading}
        loadingBody={t("copouch.member.teamLoading")}
      >
        {otherWallets.length === 0 ? (
          <PageEmpty title={t("copouch.member.teamEmptyTitle")} body={t("copouch.member.teamEmptyBody")} />
        ) : (
          <SectionCard>
            {otherWallets.map(wallet => (
              <ActionRow
                key={wallet.id}
                body={t("copouch.setting.memberCount", { count: wallet.ownerCount })}
                label={wallet.walletName || t("copouch.home.unnamedWallet")}
                onPress={() =>
                  navigation.navigate("CowalletAddMemberForTeamSelectScreen", {
                    id: route.params.id,
                    teamId: wallet.id,
                  })
                }
              />
            ))}
          </SectionCard>
        )}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletAddMemberForTeamSelectScreen({
  navigation,
  route,
}: StackProps<"CowalletAddMemberForTeamSelectScreen">) {
  const { t } = useTranslation()
  const currentAddress = useWalletStore(state => state.address)
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [teamOwners, setTeamOwners] = useState<CopouchOwner[]>([])
  const [currentOwners, setCurrentOwners] = useState<CopouchOwner[]>([])
  const [selectedAddress, setSelectedAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [teamDetail, sourceOwners, targetOwners] = await Promise.all([
        getCopouchDetail(route.params.teamId),
        getCopouchOwners(route.params.teamId),
        getCopouchOwners(route.params.id),
      ])

      setTeamName(teamDetail.walletName || t("copouch.home.unnamedWallet"))
      setTeamOwners(sourceOwners)
      setCurrentOwners(targetOwners)
      setInvalidAccess(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setInvalidAccess(true)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [route.params.id, route.params.teamId, t])

  useEffect(() => {
    void load().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.member.teamLoadFailed"))
    })
  }, [load, t])

  const disabledAddresses = useMemo(() => {
    const ownerSet = new Set(currentOwners.map(owner => owner.walletAddress.toLowerCase()))
    if (currentAddress) {
      ownerSet.add(currentAddress.toLowerCase())
    }
    return ownerSet
  }, [currentAddress, currentOwners])

  const handleSubmit = async () => {
    if (!selectedAddress) {
      return
    }

    setSubmitting(true)

    try {
      await preValidateCopouchAddOwner(route.params.id, selectedAddress)
      await addCopouchOwner(route.params.id, { walletAddress: selectedAddress })
      Alert.alert(t("common.infoTitle"), t("copouch.member.addSuccess"))
      navigation.goBack()
    } catch (error) {
      Alert.alert(t("common.errorTitle"), resolveMutationMessage(t, error, "add"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.teamSelectTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.member.teamLoading")}
      >
        <SectionCard>
          <Text style={styles.sectionTitle}>{teamName}</Text>
          <Text style={styles.helperText}>{t("copouch.member.teamSelectBody")}</Text>
        </SectionCard>

        <SectionCard>
          <View style={styles.memberList}>
            {teamOwners.map(owner => {
              const disabled = disabledAddresses.has(owner.walletAddress.toLowerCase())
              const selected = selectedAddress.toLowerCase() === owner.walletAddress.toLowerCase()

              return (
                <Pressable
                  key={owner.userId || owner.walletAddress}
                  disabled={disabled}
                  onPress={() => setSelectedAddress(selected ? "" : owner.walletAddress)}
                  style={[styles.memberRow, disabled && styles.disabledAction]}
                >
                  <AvatarBadge
                    avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                    label={owner.nickname || t("copouch.member.unknown")}
                    sublabel={formatAddress(owner.walletAddress)}
                  />
                  {disabled ? (
                    <StatusBadge label={t("copouch.member.teamDisabled")} tone="warning" />
                  ) : (
                    <StatusBadge label={selected ? t("copouch.member.selected") : t("copouch.member.select")} tone={selected ? "success" : "neutral"} />
                  )}
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <PrimaryButton
          disabled={!selectedAddress || submitting}
          label={submitting ? t("common.loading") : t("copouch.member.addAction")}
          onPress={() => void handleSubmit()}
        />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletSettingScreen({ navigation, route }: StackProps<"CowalletSettingScreen">) {
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload, setDetail } = useCopouchWalletDetail(route.params.id)
  const [owners, setOwners] = useState<CopouchOwner[]>([])
  const [ownersLoading, setOwnersLoading] = useState(true)

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true)
    try {
      const nextOwners = await loadCopouchOwnersWithGuard(route.params.id, () => setDetail(null))
      setOwners(nextOwners)
    } finally {
      setOwnersLoading(false)
    }
  }, [route.params.id, setDetail])

  const loadAll = useCallback(async () => {
    await Promise.all([reload(), loadOwners()])
  }, [loadOwners, reload])

  useEffect(() => {
    void loadAll().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
    })
  }, [loadAll, t])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.title")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading || ownersLoading}
        loadingBody={t("copouch.setting.loading")}
      >
        {detail ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: (bgPalette[detail.walletBgColor] ?? bgPalette[1]).card }]}>
              <Text style={styles.walletHeroTitle}>{detail.walletName || t("copouch.home.unnamedWallet")}</Text>
              <Text style={styles.walletHeroSub}>{formatAddress(detail.walletAddress, 10, 6)}</Text>
              <View style={styles.avatarRow}>
                {owners.slice(0, 5).map(owner => (
                  <AvatarBadge
                    key={owner.userId || owner.walletAddress}
                    avatarText={(owner.nickname || owner.walletAddress || "?").slice(0, 1).toUpperCase()}
                    label={owner.nickname || t("copouch.member.unknown")}
                  />
                ))}
              </View>
            </View>

            <SectionCard>
              <ActionRow
                body={t("copouch.setting.memberCount", { count: detail.ownerCount })}
                label={t("copouch.setting.members")}
                onPress={() => navigation.navigate("CowalletMemberScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.remindBody", { count: detail.eventMessageCount })}
                label={t("copouch.setting.reminders")}
                onPress={() => navigation.navigate("CowalletRemindScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.billBody")}
                label={t("copouch.setting.bills")}
                onPress={() => navigation.navigate("CowalletBillListScreen", { id: route.params.id })}
              />
              <ActionRow
                body={t("copouch.setting.balanceBody")}
                label={t("copouch.setting.balance")}
                onPress={() => navigation.navigate("CowalletBalanceScreen", { id: route.params.id })}
              />
            </SectionCard>

            {detail.isCreator ? (
              <SectionCard>
                <ActionRow
                  body={detail.walletName || t("copouch.home.unnamedWallet")}
                  label={t("copouch.setting.walletName")}
                  onPress={() => navigation.navigate("CowalletSetNameScreen", { id: route.params.id })}
                />
                <ActionRow
                  body={t("copouch.setting.backgroundBody")}
                  label={t("copouch.setting.background")}
                  onPress={() => navigation.navigate("CowalletBgSettingScreen", { id: route.params.id })}
                />
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletSetNameScreen({ navigation, route }: StackProps<"CowalletSetNameScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setName(wallet?.walletName ?? "")
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
      })
  }, [reload, t])

  const disabled = !name.trim() || name.trim() === (detail?.walletName ?? "") || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletName: name.trim(),
      })
      await useCowalletStore.getState().refreshOverview().catch(() => null)
      Alert.alert(t("common.infoTitle"), t("copouch.setting.nameSaved"))
      navigation.goBack()
    } catch (error) {
      const message = error instanceof ApiError && String(error.code ?? "") === "40009" ? t("copouch.setting.errors.nameExists") : t("copouch.setting.errors.nameSaveFailed")
      Alert.alert(t("common.errorTitle"), message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.walletName")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.setting.loading")}
      >
        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.setting.nameLabel")}</Text>
          <TextInput
            maxLength={10}
            onChangeText={setName}
            placeholder={t("copouch.setting.namePlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
            value={name}
          />
        </SectionCard>

        <PrimaryButton disabled={disabled} label={saving ? t("common.loading") : t("copouch.setting.save")} onPress={() => void handleSave()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletBgSettingScreen({ navigation, route }: StackProps<"CowalletBgSettingScreen">) {
  const { t } = useTranslation()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [selectedColor, setSelectedColor] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void reload()
      .then(wallet => {
        setSelectedColor(wallet?.walletBgColor ?? 1)
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.setting.loadFailed"))
      })
  }, [reload, t])

  const disabled = selectedColor === (detail?.walletBgColor ?? 1) || saving

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopouchWallet(route.params.id, {
        walletBgColor: selectedColor,
      })
      await useCowalletStore.getState().refreshOverview().catch(() => null)
      Alert.alert(t("common.infoTitle"), t("copouch.setting.backgroundSaved"))
      navigation.goBack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("copouch.setting.errors.backgroundSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.setting.background")}>
      <WalletGuard
        invalidBody={t("copouch.setting.invalidBody")}
        invalidTitle={t("copouch.setting.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.setting.loading")}
      >
        <SectionCard>
          <View style={styles.paletteColumn}>
            {Object.entries(bgPalette).map(([id, palette]) => {
              const numericId = Number(id)
              const active = numericId === selectedColor

              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedColor(numericId)}
                  style={[
                    styles.backgroundCard,
                    {
                      backgroundColor: palette.card,
                      borderColor: active ? "#0F766E" : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.backgroundCardText}>{active ? t("copouch.setting.selected") : t("copouch.setting.tapToSelect")}</Text>
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <PrimaryButton disabled={disabled} label={saving ? t("common.loading") : t("copouch.setting.save")} onPress={() => void handleSave()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletBillListScreen({ navigation, route }: StackProps<"CowalletBillListScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const profile = useUserStore(state => state.profile)
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [billLoading, setBillLoading] = useState(true)
  const [items, setItems] = useState<CopouchBillItem[]>([])
  const [stats, setStats] = useState<CopouchBillStatistics>({ totalPaymentAmount: 0, totalReceivedAmount: 0 })
  const [members, setMembers] = useState<CopouchMemberAccount[]>([])
  const [selectedFilterKey, setSelectedFilterKey] = useState<(typeof billFilters)[number]["key"]>("all")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [exporting, setExporting] = useState(false)

  const activeFilter = useMemo(() => billFilters.find(item => item.key === selectedFilterKey) ?? billFilters[0], [selectedFilterKey])

  const loadBills = useCallback(async () => {
    setBillLoading(true)
    try {
      const [billResponse, statResponse, memberResponse] = await Promise.all([
        getCopouchBillList({
          walletId: route.params.id,
          perPage: 40,
          orderTypeList: activeFilter.orderTypeList as string[] | undefined,
          userId: selectedMemberId || undefined,
        }),
        getCopouchBillStatistics({
          walletId: route.params.id,
          orderTypeList: activeFilter.orderTypeList as string[] | undefined,
          userId: selectedMemberId || undefined,
        }),
        getCopouchMemberAccountList({
          walletId: route.params.id,
          selectSelf: false,
        }),
      ])

      setItems(billResponse.items)
      setStats(statResponse)
      setMembers(memberResponse)
    } finally {
      setBillLoading(false)
    }
  }, [activeFilter.orderTypeList, route.params.id, selectedMemberId])

  useEffect(() => {
    void reload().catch(() => null)
  }, [reload])

  useEffect(() => {
    void loadBills().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.bill.loadFailed"))
    })
  }, [loadBills, t])

  const memberChips = useMemo(() => {
    return [
      { memberId: "", nickname: t("copouch.bill.filters.allMembers") },
      ...members.map(member => ({
        memberId: member.memberId,
        nickname: member.nickname || t("copouch.member.unknown"),
      })),
    ]
  }, [members, t])

  const handleExport = async () => {
    if (!profile?.email) {
      Alert.alert(t("common.infoTitle"), t("copouch.bill.exportNeedEmail"))
      return
    }

    setExporting(true)
    try {
      await exportCopouchBill({
        walletId: route.params.id,
        email: profile.email,
        orderType: activeFilter.orderTypeList?.length === 1 ? activeFilter.orderTypeList[0] : undefined,
      })
      Alert.alert(t("common.infoTitle"), t("copouch.bill.exportSuccess", { email: profile.email }))
    } catch {
      Alert.alert(t("common.errorTitle"), t("copouch.bill.exportFailed"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <Pressable disabled={exporting} onPress={() => void handleExport()}>
          <Text style={[styles.headerAction, { color: theme.colors.primary }]}>{exporting ? t("common.loading") : t("copouch.bill.export")}</Text>
        </Pressable>
      }
      title={t("copouch.bill.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.bill.invalidBody")}
        invalidTitle={t("copouch.bill.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.bill.loading")}
      >
        <SummaryGrid
          items={[
            { label: t("copouch.bill.totalReceived"), value: formatCurrency(stats.totalReceivedAmount) },
            { label: t("copouch.bill.totalPaid"), value: formatCurrency(stats.totalPaymentAmount) },
            { label: t("copouch.bill.walletName"), value: detail?.walletName || t("copouch.home.unnamedWallet") },
            { label: t("copouch.bill.itemCount"), value: String(items.length) },
          ]}
        />

        <SectionCard>
          <View style={styles.filterWrap}>
            {billFilters.map(filter => (
              <FilterChip key={filter.key} active={selectedFilterKey === filter.key} label={t(filter.titleKey)} onPress={() => setSelectedFilterKey(filter.key)} />
            ))}
          </View>
          <View style={styles.filterWrap}>
            {memberChips.map(member => (
              <FilterChip key={member.memberId || "all"} active={selectedMemberId === member.memberId} label={member.nickname} onPress={() => setSelectedMemberId(member.memberId)} />
            ))}
          </View>
          <View style={styles.inlineLinks}>
            <Pressable onPress={() => navigation.navigate("CowalletBalanceScreen", { id: route.params.id })}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("copouch.bill.openBalance")}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("CowalletRemindScreen", { id: route.params.id })}>
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>{t("copouch.bill.openRemind")}</Text>
            </Pressable>
          </View>
        </SectionCard>

        {billLoading ? <LoadingCard body={t("copouch.bill.loading")} /> : null}

        {!billLoading && items.length === 0 ? <PageEmpty title={t("copouch.bill.emptyTitle")} body={t("copouch.bill.emptyBody")} /> : null}

        {items.map(item => {
          const amount = resolveBillAmount(item)
          return (
            <Pressable
              key={item.orderSn}
              onPress={() =>
                (navigation.getParent() as any)?.navigate("OrdersStack", {
                  screen: "OrderDetailScreen",
                  params: {
                    orderSn: item.orderSn,
                    source: "manual",
                  },
                })
              }
            >
              <SectionCard>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                    {resolveTransactionTitle(t, item.transactionType, item.orderType)}
                  </Text>
                  <Text style={[styles.billAmount, { color: amount.incoming ? "#0F766E" : theme.colors.text }]}>{amount.label}</Text>
                </View>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatAddress(resolveBillCounterparty(item))}</Text>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatDateTime(item.createdAt)}</Text>
                {item.canAllocate ? (
                  <SecondaryButton
                    label={t("copouch.bill.reallocate")}
                    onPress={() =>
                      navigation.navigate("CowalletAllocationScreen", {
                        id: route.params.id,
                        orderSn: item.orderSn,
                      })
                    }
                  />
                ) : item.reallocateWalletAddress ? (
                  <SecondaryButton
                    label={t("copouch.bill.viewAllocation")}
                    onPress={() =>
                      navigation.navigate("CowalletViewAllocationScreen", {
                        id: route.params.id,
                        orderSn: item.orderSn,
                      })
                    }
                  />
                ) : null}
              </SectionCard>
            </Pressable>
          )
        })}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletRemindScreen({ navigation, route }: StackProps<"CowalletRemindScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const lastEvent = useSocketStore(state => state.lastEvent)
  const { loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [events, setEvents] = useState<CopouchEvent[]>([])
  const [eventLoading, setEventLoading] = useState(true)

  const loadEvents = useCallback(async () => {
    setEventLoading(true)
    try {
      const response = await getCopouchWalletEvents({
        walletId: route.params.id,
        perPage: 40,
      })
      setEvents(response.items)
      if (response.items.length > 0) {
        await markAllCopouchEventsRead().catch(() => null)
      }
    } finally {
      setEventLoading(false)
    }
  }, [route.params.id])

  useEffect(() => {
    void Promise.all([reload().catch(() => null), loadEvents()]).catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.remind.loadFailed"))
    })
  }, [loadEvents, reload, t])

  useFocusEffect(
    React.useCallback(() => {
      void loadEvents().catch(() => null)
    }, [loadEvents]),
  )

  useEffect(() => {
    if (lastEvent?.type && ["MultisigWalletMemberAddSuc", "MultisigWalletMemberDelSuc"].includes(lastEvent.type)) {
      void loadEvents().catch(() => null)
    }
  }, [lastEvent, loadEvents])

  return (
    <CopouchScaffold
      canGoBack
      onBack={navigation.goBack}
      right={
        <Pressable onPress={() => void markAllCopouchEventsRead().then(() => loadEvents())}>
          <Text style={[styles.headerAction, { color: theme.colors.primary }]}>{t("copouch.remind.readAll")}</Text>
        </Pressable>
      }
      title={t("copouch.remind.title")}
    >
      <WalletGuard
        invalidBody={t("copouch.remind.invalidBody")}
        invalidTitle={t("copouch.remind.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.remind.loading")}
      >
        {eventLoading ? <LoadingCard body={t("copouch.remind.loading")} /> : null}
        {!eventLoading && events.length === 0 ? <PageEmpty title={t("copouch.remind.emptyTitle")} body={t("copouch.remind.emptyBody")} /> : null}
        {events.map(event => (
          <SectionCard key={event.id}>
            <View style={styles.eventRow}>
              <View style={[styles.eventAvatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.eventAvatarText}>{(event.targetUserName || event.operatorUserName || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{resolveEventMessage(t, event)}</Text>
                <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>{formatDateTime(event.eventTime)}</Text>
              </View>
            </View>
          </SectionCard>
        ))}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletBalanceScreen({ navigation, route }: StackProps<"CowalletBalanceScreen">) {
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [wallet, setWallet] = useState<CopouchDetail | null>(null)
  const [assets, setAssets] = useState<CopouchAssetItem[]>([])
  const [memberAccounts, setMemberAccounts] = useState<CopouchMemberAccount[]>([])
  const [totalValue, setTotalValue] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [assetResponse, memberResponse] = await Promise.all([
        getCopouchAssetBreakdown({
          walletId: route.params.id,
          chainId,
        }),
        getCopouchMemberAccountList({
          walletId: route.params.id,
          selectSelf: false,
        }),
      ])

      setWallet(assetResponse.wallet)
      setAssets(assetResponse.assets)
      setTotalValue(assetResponse.totalValue)
      setMemberAccounts(memberResponse)
      setInvalidAccess(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setInvalidAccess(true)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [chainId, route.params.id])

  useEffect(() => {
    void load().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.balance.loadFailed"))
    })
  }, [load, t])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.balance.title")}>
      <WalletGuard
        invalidBody={t("copouch.balance.invalidBody")}
        invalidTitle={t("copouch.balance.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.balance.loading")}
      >
        <SummaryGrid
          items={[
            { label: t("copouch.balance.totalAssets"), value: formatCurrency(totalValue) },
            { label: t("copouch.balance.assetCount"), value: String(assets.filter(item => item.balance > 0).length) },
            { label: t("copouch.balance.memberCount"), value: String(wallet?.ownerCount ?? memberAccounts.length) },
            { label: t("copouch.balance.walletName"), value: wallet?.walletName || t("copouch.home.unnamedWallet") },
          ]}
        />

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.balance.assetList")}</Text>
          {assets.length === 0 ? (
            <PageEmpty title={t("copouch.balance.emptyAssetsTitle")} body={t("copouch.balance.emptyAssetsBody")} />
          ) : (
            <View style={styles.assetList}>
              {assets.map(asset => (
                <View key={asset.coinCode} style={styles.rowBetween}>
                  <View>
                    <Text style={styles.rowTitle}>{asset.coinName || asset.coinCode}</Text>
                    <Text style={styles.helperText}>{formatTokenAmount(asset.balance)} {asset.coinCode}</Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(asset.totalValue)}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>{t("copouch.balance.memberSection")}</Text>
          {memberAccounts.length === 0 ? (
            <PageEmpty title={t("copouch.balance.emptyMembersTitle")} body={t("copouch.balance.emptyMembersBody")} />
          ) : (
            <View style={styles.assetList}>
              {memberAccounts.map(member => (
                <View key={member.memberId} style={styles.memberStatCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.rowTitle}>{member.nickname || t("copouch.member.unknown")}</Text>
                    <Text style={[styles.billAmount, { color: member.balanceAmount >= 0 ? "#0F766E" : "#B91C1C" }]}>
                      {formatAmount(member.balanceAmount)}
                    </Text>
                  </View>
                  <View style={styles.statTriplet}>
                    <FieldRow label={t("copouch.balance.credit")} value={formatAmount(member.creditAmount)} />
                    <FieldRow label={t("copouch.balance.debit")} value={formatAmount(member.debitAmount)} />
                    <FieldRow label={t("copouch.balance.balance")} value={formatAmount(member.balanceAmount)} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </WalletGuard>
    </CopouchScaffold>
  )
}

function CopouchTransferScreen(props: {
  mode: TransferMode
  navigation: StackProps<"CowalletSendSelfScreen">["navigation"] | StackProps<"CowalletReceiveScreen">["navigation"]
  route: StackProps<"CowalletSendSelfScreen">["route"] | StackProps<"CowalletReceiveScreen">["route"]
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const walletAddress = useWalletStore(state => state.address)
  const profile = useUserStore(state => state.profile)
  const balances = useBalanceStore(state => state.balances)
  const loadCoins = useBalanceStore(state => state.loadCoins)
  const currentChainName = resolveChainNameById(chainId)
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(props.route.params.id)
  const [safeAssets, setSafeAssets] = useState<CopouchAssetItem[]>([])
  const [assetLoading, setAssetLoading] = useState(false)
  const [channels, setChannels] = useState<TransferChannel[]>([])
  const [channelLoading, setChannelLoading] = useState(true)
  const [selectedChannelKey, setSelectedChannelKey] = useState("")
  const [options, setOptions] = useState<TransferOrderOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedOptionCode, setSelectedOptionCode] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [gasAmount, setGasAmount] = useState(0)
  const [quotedOption, setQuotedOption] = useState<TransferOrderOption | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void reload().catch(() => null)
    if (props.mode === "deposit") {
      void loadCoins(chainId).catch(() => null)
    }
  }, [chainId, loadCoins, props.mode, reload])

  useEffect(() => {
    if (props.mode !== "withdraw") {
      return
    }

    setAssetLoading(true)
    void getCopouchAssetBreakdown({
      walletId: props.route.params.id,
      chainId,
    })
      .then(response => {
        setSafeAssets(response.assets)
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.transfer.loadFailed"))
      })
      .finally(() => {
        setAssetLoading(false)
      })
  }, [chainId, props.mode, props.route.params.id, t])

  useEffect(() => {
    setChannelLoading(true)
    void getTransferChannels(chainId, "transfer")
      .then(nextChannels => {
        setChannels(nextChannels)
        if (nextChannels.length > 0) {
          setSelectedChannelKey(nextChannels[0].key)
        }
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.transfer.channelLoadFailed"))
      })
      .finally(() => {
        setChannelLoading(false)
      })
  }, [chainId, t])

  const selectedChannel = useMemo(() => channels.find(channel => channel.key === selectedChannelKey) ?? channels[0] ?? null, [channels, selectedChannelKey])

  useEffect(() => {
    if (!selectedChannel) {
      setOptions([])
      return
    }

    setOptionsLoading(true)
    void getTransferOrderOptions({
      sendChainName: currentChainName,
      receiveChainName: selectedChannel.receiveChainName,
      channelType: selectedChannel.channelType,
    })
      .then(response => {
        setOptions(response.options)
        setSelectedOptionCode(response.options[0]?.sendCoinCode ?? "")
      })
      .catch(() => {
        Alert.alert(t("common.errorTitle"), t("copouch.transfer.optionLoadFailed"))
      })
      .finally(() => {
        setOptionsLoading(false)
      })
  }, [currentChainName, selectedChannel, t])

  const selectedOption = useMemo(() => options.find(option => option.sendCoinCode === selectedOptionCode) ?? options[0] ?? null, [options, selectedOptionCode])
  const numericAmount = Number(amount || 0)
  const sourceBalances = useMemo(() => {
    if (props.mode === "withdraw") {
      return safeAssets.reduce<Record<string, number>>((acc, asset) => {
        acc[asset.coinCode] = asset.balance
        return acc
      }, {})
    }

    return balances
  }, [balances, props.mode, safeAssets])

  const availableBalance = selectedOption ? sourceBalances[selectedOption.sendCoinCode] ?? 0 : 0
  const gasBalance =
    sourceBalances[currentChainName] ??
    sourceBalances[detail?.chainName ?? ""] ??
    sourceBalances.BTT ??
    sourceBalances.BTT_TEST ??
    0

  useEffect(() => {
    if (!selectedOption?.sendCoinContract || !selectedChannel) {
      setGasAmount(0)
      return
    }

    void getTransferGasEstimate({
      chainName: currentChainName,
      contractAddress: selectedOption.sendCoinContract,
    })
      .then(response => {
        setGasAmount(response.gasAmount)
      })
      .catch(() => {
        setGasAmount(0)
      })
  }, [currentChainName, selectedChannel, selectedOption?.sendCoinContract])

  useEffect(() => {
    if (!selectedOption || !numericAmount || numericAmount <= 0) {
      setQuotedOption(null)
      return
    }

    void getTransferQuote({
      sendCoinCode: selectedOption.sendCoinCode,
      recvCoinCode: selectedOption.recvCoinCode,
      recvAmount: numericAmount,
    })
      .then(quote => {
        setQuotedOption({
          ...selectedOption,
          sellerId: String(quote.sellerId ?? selectedOption.sellerId),
          feeAmount: quote.feeValue,
          recvEstimateAmount: quote.recvAmount,
          sendMinAmount: quote.sendMinAmount,
        })
      })
      .catch(() => {
        setQuotedOption(null)
      })
  }, [numericAmount, selectedOption])

  const resolvedOption = quotedOption && selectedOption && quotedOption.sendCoinCode === selectedOption.sendCoinCode ? quotedOption : selectedOption
  const destinationAddress = props.mode === "withdraw" ? walletAddress ?? "" : detail?.walletAddress ?? ""
  const destinationTitle =
    props.mode === "withdraw" ? profile?.nickname || t("copouch.transfer.me") : detail?.walletName || t("copouch.home.unnamedWallet")

  const validationMessage = useMemo(() => {
    if (!detail) {
      return t("copouch.transfer.walletMissing")
    }

    if (!destinationAddress) {
      return t("copouch.transfer.addressMissing")
    }

    if (!selectedChannel) {
      return t("copouch.transfer.channelMissing")
    }

    if (!resolvedOption) {
      return t("copouch.transfer.optionMissing")
    }

    if (!amount) {
      return t("copouch.transfer.amountRequired")
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return t("copouch.transfer.amountInvalid")
    }

    if (resolvedOption.sendMinAmount > 0 && numericAmount < resolvedOption.sendMinAmount) {
      return t("copouch.transfer.amountTooSmall", { amount: formatAmount(resolvedOption.sendMinAmount) })
    }

    if (numericAmount > availableBalance) {
      return t("copouch.transfer.balanceInsufficient")
    }

    if (gasAmount > 0 && gasBalance < gasAmount) {
      return t("copouch.transfer.gasInsufficient")
    }

    return ""
  }, [amount, availableBalance, destinationAddress, detail, gasAmount, gasBalance, numericAmount, resolvedOption, selectedChannel, t])

  const handleSubmit = async () => {
    if (validationMessage) {
      Alert.alert(t("common.errorTitle"), validationMessage)
      return
    }

    if (!resolvedOption || !selectedChannel) {
      return
    }

    setSubmitting(true)
    try {
      const order =
        selectedChannel.channelType === "normal"
          ? await createNormalTransferOrder({
              coinCode: resolvedOption.sendCoinCode,
              amount: numericAmount,
              recvAddress: destinationAddress,
              note,
              multisigWalletId: props.route.params.id,
            })
          : await createBridgeTransferOrder({
              sellerId: resolvedOption.sellerId ? Number(resolvedOption.sellerId) : undefined,
              recvAddress: destinationAddress,
              recvCoinCode: resolvedOption.recvCoinCode,
              sendCoinCode: resolvedOption.sendCoinCode,
              sendAmount: numericAmount,
              note,
              multisigWalletId: props.route.params.id,
            })

      ;(props.navigation.getParent() as any)?.navigate("TransferStack", {
        screen: selectedChannel.channelType === "normal" ? "TransferConfirmNormalScreen" : "TransferConfirmScreen",
        params: {
          orderSn: order.orderSn,
        },
      })
    } catch {
      Alert.alert(t("common.errorTitle"), t("copouch.transfer.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CopouchScaffold
      canGoBack
      onBack={props.navigation.goBack}
      title={props.mode === "withdraw" ? t("copouch.transfer.withdrawTitle") : t("copouch.transfer.depositTitle")}
    >
      <WalletGuard
        invalidBody={t("copouch.transfer.invalidBody")}
        invalidTitle={t("copouch.transfer.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.transfer.loading")}
      >
        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.destination")}</Text>
          <View style={styles.destinationCard}>
            <AvatarBadge
              avatarText={(destinationTitle || destinationAddress || "?").slice(0, 1).toUpperCase()}
              label={destinationTitle}
              sublabel={formatAddress(destinationAddress)}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.channelLabel")}</Text>
          {channelLoading ? (
            <LoadingCard body={t("copouch.transfer.channelLoading")} />
          ) : (
            <View style={styles.filterWrap}>
              {channels.map(channel => (
                <FilterChip key={channel.key} active={selectedChannelKey === channel.key} label={channel.title} onPress={() => setSelectedChannelKey(channel.key)} />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.assetLabel")}</Text>
          {optionsLoading || assetLoading ? (
            <LoadingCard body={t("copouch.transfer.assetLoading")} />
          ) : (
            <View style={styles.filterWrap}>
              {options.map(option => (
                <FilterChip key={`${option.sendCoinCode}:${option.recvCoinCode}`} active={selectedOptionCode === option.sendCoinCode} label={option.sendCoinCode} onPress={() => setSelectedOptionCode(option.sendCoinCode)} />
              ))}
            </View>
          )}
          <Text style={[styles.helperText, { color: theme.colors.mutedText }]}>
            {t("copouch.transfer.availableBalance", { amount: formatAmount(availableBalance), symbol: selectedOption?.sendCoinCode || "--" })}
          </Text>
        </SectionCard>

        <SectionCard>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.amountLabel")}</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={value => setAmount(parseDecimalInput(value))}
            placeholder={t("copouch.transfer.amountPlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
            value={amount}
          />
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.transfer.noteLabel")}</Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder={t("copouch.transfer.notePlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text }]}
            value={note}
          />
          <FieldRow label={t("copouch.transfer.estimate")} value={formatAmount(resolvedOption?.recvEstimateAmount ?? numericAmount)} />
          <FieldRow label={t("copouch.transfer.gas")} value={gasAmount > 0 ? formatAmount(gasAmount) : "--"} />
          <FieldRow label={t("copouch.transfer.direction")} value={props.mode === "withdraw" ? t("copouch.transfer.directionOut") : t("copouch.transfer.directionIn")} />
          {validationMessage ? <Text style={[styles.helperText, { color: "#DC2626" }]}>{validationMessage}</Text> : null}
        </SectionCard>

        <PrimaryButton disabled={Boolean(validationMessage) || submitting} label={submitting ? t("common.loading") : t("copouch.transfer.next")} onPress={() => void handleSubmit()} />
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletSendSelfScreen(props: StackProps<"CowalletSendSelfScreen">) {
  return <CopouchTransferScreen mode="withdraw" navigation={props.navigation} route={props.route} />
}

export function CowalletReceiveScreen(props: StackProps<"CowalletReceiveScreen">) {
  return <CopouchTransferScreen mode="deposit" navigation={props.navigation} route={props.route} />
}

export function CowalletAllocationScreen({ navigation, route }: StackProps<"CowalletAllocationScreen">) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [candidates, setCandidates] = useState<CopouchReallocateCandidate[]>([])
  const [info, setInfo] = useState<CopouchReallocateInfo | null>(null)
  const [orderIsBuyer, setOrderIsBuyer] = useState(false)
  const [selectedWalletAddress, setSelectedWalletAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [candidateResponse, infoResponse, orderDetail] = await Promise.all([
        getCopouchOwnersIgnoreDelete(route.params.id),
        getCopouchReallocateInfo(route.params.orderSn),
        getOrderDetail(route.params.orderSn),
      ])

      setCandidates(candidateResponse)
      setInfo(infoResponse)
      setSelectedWalletAddress(infoResponse.reallocateWalletAddress)
      setOrderIsBuyer(orderDetail.isBuyer)
      setInvalidAccess(false)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || String(error.code ?? "") === "60001")) {
        setInvalidAccess(true)
      } else {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }, [route.params.id, route.params.orderSn])

  useEffect(() => {
    void load().catch(() => {
      Alert.alert(t("common.errorTitle"), t("copouch.allocation.loadFailed"))
    })
  }, [load, t])

  const availableCandidates = useMemo(() => candidates.filter(candidate => candidate.deleted === 0), [candidates])

  const handleSubmit = async () => {
    const selectedCandidate = availableCandidates.find(candidate => candidate.walletAddress === selectedWalletAddress)
    if (!selectedCandidate) {
      return
    }

    setSubmitting(true)

    try {
      await reallocateCopouchMember({
        orderSn: route.params.orderSn,
        reallocateUserId: selectedCandidate.userId,
        walletId: route.params.id,
        reallocateWalletAddress: selectedCandidate.walletAddress,
      })
      Alert.alert(t("common.infoTitle"), t("copouch.allocation.saveSuccess"))
      navigation.goBack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("copouch.allocation.saveFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const title = info && (info.transactionType === 1 || info.transactionType === 2) ? t("copouch.allocation.expenseTitle") : t("copouch.allocation.incomeTitle")

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={title}>
      <WalletGuard
        invalidBody={t("copouch.allocation.invalidBody")}
        invalidTitle={t("copouch.allocation.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.allocation.loading")}
      >
        {info ? (
          <>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t("copouch.allocation.amountLabel")}</Text>
              <Text style={styles.allocationAmount}>{formatAmount(info.amount)}</Text>
              <Text style={styles.helperText}>
                {(info.transactionType === 1 || info.transactionType === 2) ? t("copouch.allocation.expenseBody") : t("copouch.allocation.incomeBody")}
              </Text>
            </SectionCard>

            <SectionCard>
              <View style={styles.memberList}>
                {availableCandidates.map(candidate => {
                  const selected = selectedWalletAddress === candidate.walletAddress
                  return (
                    <Pressable key={candidate.userId || candidate.walletAddress} onPress={() => setSelectedWalletAddress(candidate.walletAddress)} style={styles.memberRow}>
                      <AvatarBadge
                        avatarText={(candidate.nickname || candidate.walletAddress || "?").slice(0, 1).toUpperCase()}
                        label={candidate.nickname || t("copouch.member.unknown")}
                        sublabel={formatAddress(candidate.walletAddress)}
                      />
                      <StatusBadge label={selected ? t("copouch.member.selected") : t("copouch.member.select")} tone={selected ? "success" : "neutral"} />
                    </Pressable>
                  )
                })}
              </View>
            </SectionCard>

            <PrimaryButton
              disabled={!orderIsBuyer || !selectedWalletAddress || submitting}
              label={submitting ? t("common.loading") : t("copouch.allocation.confirm")}
              onPress={() => void handleSubmit()}
            />
            {!orderIsBuyer ? <Text style={styles.helperText}>{t("copouch.allocation.buyerOnly")}</Text> : null}
          </>
        ) : null}
      </WalletGuard>
    </CopouchScaffold>
  )
}

export function CowalletViewAllocationScreen({ navigation, route }: StackProps<"CowalletViewAllocationScreen">) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [invalidAccess, setInvalidAccess] = useState(false)
  const [info, setInfo] = useState<CopouchReallocateInfo | null>(null)

  useEffect(() => {
    setLoading(true)
    void getCopouchReallocateInfo(route.params.orderSn)
      .then(response => {
        setInfo(response)
        setInvalidAccess(false)
      })
      .catch(error => {
        if (error instanceof ApiError && String(error.code ?? "") === "60001") {
          setInvalidAccess(true)
        } else {
          Alert.alert(t("common.errorTitle"), t("copouch.allocation.loadFailed"))
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [route.params.orderSn, t])

  const title = info && (info.transactionType === 1 || info.transactionType === 2) ? t("copouch.allocation.viewExpenseTitle") : t("copouch.allocation.viewIncomeTitle")

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={title}>
      <WalletGuard
        invalidBody={t("copouch.allocation.invalidBody")}
        invalidTitle={t("copouch.allocation.invalidTitle")}
        invalidAccess={invalidAccess}
        loading={loading}
        loadingBody={t("copouch.allocation.loading")}
      >
        {info ? (
          <>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t("copouch.allocation.amountLabel")}</Text>
              <Text style={styles.allocationAmount}>{formatAmount(info.amount)}</Text>
              <Text style={styles.helperText}>
                {(info.transactionType === 1 || info.transactionType === 2)
                  ? t("copouch.allocation.viewExpenseBody", { name: info.ownerNickname })
                  : t("copouch.allocation.viewIncomeBody", { name: info.ownerNickname })}
              </Text>
            </SectionCard>

            <SectionCard>
              <View style={styles.memberRow}>
                <AvatarBadge
                  avatarText={(info.reallocateNickname || info.reallocateWalletAddress || "?").slice(0, 1).toUpperCase()}
                  label={info.reallocateNickname || t("copouch.member.unknown")}
                  sublabel={formatAddress(info.reallocateWalletAddress)}
                />
                <StatusBadge label={t("copouch.allocation.currentOwner")} tone="success" />
              </View>
            </SectionCard>
          </>
        ) : null}
      </WalletGuard>
    </CopouchScaffold>
  )
}

const styles = StyleSheet.create({
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

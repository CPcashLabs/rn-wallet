import React, { useCallback, useEffect, useMemo, useState } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Text, View } from "react-native"

import type { CopouchStackParamList } from "@/app/navigation/types"
import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import {
  AvatarBadge,
  StatusBadge,
  WalletGuard,
  styles,
} from "@/features/copouch/screens/copouchOperationShared"
import {
  getCopouchOwnersIgnoreDelete,
  getCopouchReallocateInfo,
  reallocateCopouchMember,
  type CopouchReallocateCandidate,
  type CopouchReallocateInfo,
} from "@/features/copouch/services/copouchApi"
import { formatAddress } from "@/features/home/utils/format"
import { getOrderDetail } from "@/features/orders/services/ordersApi"
import { PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { formatAmount } from "@/features/transfer/utils/order"
import { ApiError } from "@/shared/errors"
import { useToast } from "@/shared/toast/useToast"

type StackProps<T extends keyof CopouchStackParamList> = NativeStackScreenProps<CopouchStackParamList, T>

export function CopouchAllocationScreen({ navigation, route }: StackProps<"CopouchAllocationScreen">) {
  const { t } = useTranslation()
  const { showToast } = useToast()
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
      showToast({ message: t("copouch.allocation.saveSuccess"), tone: "success" })
      navigation.goBack()
    } catch {
      showToast({ message: t("copouch.allocation.saveFailed"), tone: "error" })
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

export function CopouchViewAllocationScreen({ navigation, route }: StackProps<"CopouchViewAllocationScreen">) {
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

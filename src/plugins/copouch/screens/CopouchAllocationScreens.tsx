import React, { useEffect, useMemo, useState } from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Pressable, Text, View } from "react-native"

import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import type { CopouchStackScreenProps } from "@/plugins/copouch/screens/copouchScreenProps"
import {
  AvatarBadge,
  StatusBadge,
  WalletGuard,
  styles,
} from "@/plugins/copouch/screens/copouchOperationShared"
import {
  invalidateCopouchQueries,
  useCopouchOwnersIgnoreDeleteQuery,
  useCopouchReallocateInfoQuery,
} from "@/plugins/copouch/queries/copouchQueries"
import {
  reallocateCopouchMember,
  type CopouchReallocateCandidate,
  type CopouchReallocateInfo,
} from "@/plugins/copouch/services/copouchApi"
import { formatAddress } from "@/shared/utils/format"
import { getWalletOrderAccess } from "@/domains/wallet/shared/services/orderDetailAccess"
import { PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { formatAmount } from "@/shared/exchange/utils/order"
import { ApiError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useToast } from "@/shared/toast/useToast"

function isCopouchAllocationInvalidAccessError(error: unknown) {
  return error instanceof ApiError && (error.status === 403 || String(error.code ?? "") === "60001")
}

function useWalletOrderAccessQuery(orderSn: string) {
  return useQuery({
    queryKey: ["orders", "detail-access", orderSn],
    queryFn: () => getWalletOrderAccess(orderSn),
    enabled: Boolean(orderSn),
  })
}

export function CopouchAllocationScreen({ navigation, route }: CopouchStackScreenProps<"CopouchAllocationScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const candidatesQuery = useCopouchOwnersIgnoreDeleteQuery(route.params.id)
  const infoQuery = useCopouchReallocateInfoQuery(route.params.orderSn)
  const orderAccessQuery = useWalletOrderAccessQuery(route.params.orderSn)
  const candidates = (candidatesQuery.data ?? []) as CopouchReallocateCandidate[]
  const info = (infoQuery.data ?? null) as CopouchReallocateInfo | null
  const orderIsBuyer = orderAccessQuery.data?.isBuyer ?? false
  const loading = candidatesQuery.isLoading || infoQuery.isLoading || orderAccessQuery.isLoading
  const invalidAccess =
    isCopouchAllocationInvalidAccessError(candidatesQuery.error) ||
    isCopouchAllocationInvalidAccessError(infoQuery.error) ||
    isCopouchAllocationInvalidAccessError(orderAccessQuery.error)
  const [selectedWalletAddress, setSelectedWalletAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (info?.reallocateWalletAddress) {
      setSelectedWalletAddress(current => current || info.reallocateWalletAddress)
    }
  }, [info?.reallocateWalletAddress])

  const loadError = invalidAccess ? null : candidatesQuery.error ?? infoQuery.error ?? orderAccessQuery.error

  useEffect(() => {
    if (!loadError) {
      return
    }

    presentError(loadError, {
      fallbackKey: "copouch.allocation.loadFailed",
    })
  }, [loadError, presentError])

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
      await invalidateCopouchQueries(queryClient)
      showToast({ message: t("copouch.allocation.saveSuccess"), tone: "success" })
      navigation.goBack()
    } catch (error) {
      presentError(error, {
        fallbackKey: "copouch.allocation.saveFailed",
        mode: "toast",
      })
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

export function CopouchViewAllocationScreen({ navigation, route }: CopouchStackScreenProps<"CopouchViewAllocationScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const infoQuery = useCopouchReallocateInfoQuery(route.params.orderSn)
  const loading = infoQuery.isLoading
  const invalidAccess = isCopouchAllocationInvalidAccessError(infoQuery.error)
  const info = (infoQuery.data ?? null) as CopouchReallocateInfo | null

  useEffect(() => {
    if (!infoQuery.error || invalidAccess) {
      return
    }

    presentError(infoQuery.error, {
      fallbackKey: "copouch.allocation.loadFailed",
    })
  }, [infoQuery.error, invalidAccess, presentError])

  const title =
    info && (info.transactionType === 1 || info.transactionType === 2)
      ? t("copouch.allocation.viewExpenseTitle")
      : t("copouch.allocation.viewIncomeTitle")

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

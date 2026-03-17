import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Text, View } from "react-native"

import { CopouchScaffold } from "@/plugins/copouch/components/CopouchScaffold"
import type { CopouchStackScreenProps } from "@/plugins/copouch/screens/copouchScreenProps"
import {
  AvatarBadge,
  StatusBadge,
  WalletGuard,
  groupOwners,
  isEvmAddress,
  isCopouchForbiddenError,
  normalizeWalletAddress,
  resolveMemberBadgeKey,
  resolveMutationMessage,
  styles,
  useCopouchWalletDetail,
} from "@/plugins/copouch/screens/copouchOperationShared"
import {
  addCopouchOwner,
  preValidateCopouchAddOwner,
  preValidateCopouchRemoveOwner,
  removeCopouchOwner,
  syncCopouchOwners,
  type CopouchOwner,
} from "@/plugins/copouch/services/copouchApi"
import {
  invalidateCopouchQueries,
  useCopouchDetailQuery,
  useCopouchOverviewQuery,
  useCopouchOwnersQuery,
} from "@/plugins/copouch/queries/copouchQueries"
import { formatAddress } from "@/shared/utils/format"
import { ActionRow } from "@/shared/ui/WalletCommonUi"
import { PageEmpty, PrimaryButton, SectionCard } from "@/shared/ui/AppFlowUi"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

export function CopouchMemberScreen({ navigation, route }: CopouchStackScreenProps<"CopouchMemberScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const copouchRevision = useSocketStore(state => state.copouchRevision)
  const { detail, error: detailError, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const ownersQuery = useCopouchOwnersQuery(route.params.id)
  const owners = (ownersQuery.data ?? []) as CopouchOwner[]
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(ownersQuery.error)

  useEffect(() => {
    if (copouchRevision <= 0) {
      return
    }

    void Promise.all([reload(), ownersQuery.refetch()]).catch(() => null)
  }, [copouchRevision, ownersQuery.refetch, reload])

  useEffect(() => {
    if (detailError && !isCopouchForbiddenError(detailError)) {
      presentError(detailError, {
        fallbackKey: "copouch.member.loadFailed",
      })
    }
  }, [detailError, presentError])

  useEffect(() => {
    if (ownersQuery.error && !isCopouchForbiddenError(ownersQuery.error)) {
      presentError(ownersQuery.error, {
        fallbackKey: "copouch.member.loadFailed",
      })
    }
  }, [ownersQuery.error, presentError])

  const groups = useMemo(() => groupOwners(owners), [owners])

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.title")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={screenInvalidAccess}
        loading={loading || ownersQuery.isLoading}
        loadingBody={t("copouch.member.loading")}
      >
        {detail?.isCreator ? (
          <SectionCard>
            <View style={styles.quickRow}>
              <Pressable style={styles.quickCell} onPress={() => navigation.navigate("CopouchAddMemberScreen", { id: route.params.id })}>
                <Text style={styles.quickEmoji}>+</Text>
                <Text style={styles.quickLabel}>{t("copouch.member.addAction")}</Text>
              </Pressable>
              <Pressable style={styles.quickCell} onPress={() => navigation.navigate("CopouchDeleteMemberScreen", { id: route.params.id })}>
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

export function CopouchDeleteMemberScreen({ navigation, route }: CopouchStackScreenProps<"CopouchDeleteMemberScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { detail, error: detailError, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const ownersQuery = useCopouchOwnersQuery(route.params.id)
  const owners = (ownersQuery.data ?? []) as CopouchOwner[]
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(ownersQuery.error)
  const [deletingWalletAddress, setDeletingWalletAddress] = useState("")
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshOwners = useCallback(async () => {
    await Promise.all([reload(), ownersQuery.refetch()])
  }, [ownersQuery.refetch, reload])

  useEffect(() => {
    if (detailError && !isCopouchForbiddenError(detailError)) {
      presentError(detailError, {
        fallbackKey: "copouch.member.loadFailed",
      })
    }
  }, [detailError, presentError])

  useEffect(() => {
    if (ownersQuery.error && !isCopouchForbiddenError(ownersQuery.error)) {
      presentError(ownersQuery.error, {
        fallbackKey: "copouch.member.loadFailed",
      })
    }
  }, [ownersQuery.error, presentError])

  const members = useMemo(() => owners.filter(owner => !owner.isCreator), [owners])

  const handleDeleteOwner = useCallback(
    async (owner: CopouchOwner) => {
      if (!mountedRef.current) {
        return
      }

      setDeletingWalletAddress(owner.walletAddress)

      try {
        await preValidateCopouchRemoveOwner(route.params.id, owner.walletAddress)
        await removeCopouchOwner(route.params.id, { walletAddress: owner.walletAddress })

        if (mountedRef.current) {
          await refreshOwners()
        }

        if (!mountedRef.current) {
          return
        }

        await invalidateCopouchQueries(queryClient)
        showToast({ message: t("copouch.member.removeSuccess"), tone: "success" })
      } catch (error) {
        try {
          await syncCopouchOwners(route.params.id)

          if (mountedRef.current) {
            await refreshOwners()
          }
        } catch {
          // ignore sync errors and surface the original mutation error
        }

        if (!mountedRef.current) {
          return
        }

        presentMessage(resolveMutationMessage(t, error, "remove"), {
          mode: "toast",
        })
      } finally {
        if (mountedRef.current) {
          setDeletingWalletAddress("")
        }
      }
    },
    [presentMessage, queryClient, refreshOwners, route.params.id, showToast, t],
  )

  const confirmDelete = useCallback(
    (owner: CopouchOwner) => {
      Alert.alert(t("copouch.member.deleteConfirmTitle"), t("copouch.member.deleteConfirmBody", { name: owner.nickname || formatAddress(owner.walletAddress) }), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => {
            void handleDeleteOwner(owner)
          },
        },
      ])
    },
    [handleDeleteOwner, t],
  )

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.deleteTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={screenInvalidAccess}
        loading={loading || ownersQuery.isLoading}
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
                      <Pressable
                        disabled={deleting}
                        onPress={() => confirmDelete(owner)}
                        style={[
                          styles.inlineAction,
                          {
                            backgroundColor: theme.colors.infoSoft,
                            borderColor: theme.colors.infoBorder,
                          },
                          deleting && styles.disabledAction,
                        ]}
                      >
                        <Text style={[styles.inlineActionText, { color: theme.colors.info }]}>
                          {deleting ? t("common.loading") : t("copouch.member.deleteAction")}
                        </Text>
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

export function CopouchAddMemberScreen({ navigation, route }: CopouchStackScreenProps<"CopouchAddMemberScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { detail, error: detailError, loading, invalidAccess } = useCopouchWalletDetail(route.params.id)
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(detailError)
  const [walletAddress, setWalletAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!detailError || isCopouchForbiddenError(detailError)) {
      return
    }

    presentError(detailError, {
      fallbackKey: "copouch.member.loadFailed",
    })
  }, [detailError, presentError])

  const normalizedAddress = normalizeWalletAddress(walletAddress)
  const validationMessage = useMemo(() => {
    if (!normalizedAddress) {
      return t("copouch.member.errors.addressRequired")
    }

    return isEvmAddress(normalizedAddress) ? "" : t("copouch.member.errors.addressInvalid")
  }, [normalizedAddress, t])

  const handleSubmit = async (address: string) => {
    if (validationMessage) {
      showToast({ message: validationMessage, tone: "warning" })
      return
    }

    setSubmitting(true)

    try {
      await preValidateCopouchAddOwner(route.params.id, address)
      await addCopouchOwner(route.params.id, { walletAddress: address })
      await invalidateCopouchQueries(queryClient)
      showToast({ message: t("copouch.member.addSuccess"), tone: "success" })
      navigation.goBack()
    } catch (error) {
      presentMessage(resolveMutationMessage(t, error, "add"), {
        mode: "toast",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.addTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={screenInvalidAccess}
        loading={loading}
        loadingBody={t("copouch.member.loading")}
      >
        {!detail?.isCreator ? (
          <PageEmpty title={t("copouch.member.creatorOnlyTitle")} body={t("copouch.member.creatorOnlyBody")} />
        ) : (
          <>
            <SectionCard>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{t("copouch.member.walletAddressLabel")}</Text>
              <AppTextField
                autoCapitalize="none"
                backgroundTone="background"
                error={validationMessage || null}
                helperText={t("copouch.member.addressHint")}
                onChangeText={setWalletAddress}
                placeholder={t("copouch.member.walletAddressPlaceholder")}
                value={walletAddress}
              />
            </SectionCard>

            <SectionCard>
              <ActionRow
                body={t("copouch.member.teamImportBody")}
                label={t("copouch.member.teamImportTitle")}
                onPress={() => navigation.navigate("CopouchAddMemberForTeamScreen", { id: route.params.id })}
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

export function CopouchAddMemberForTeamScreen({ navigation, route }: CopouchStackScreenProps<"CopouchAddMemberForTeamScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const walletAddress = useWalletStore(state => state.address)
  const chainId = useWalletStore(state => state.chainId)
  const { error: detailError, invalidAccess, loading: detailLoading } = useCopouchWalletDetail(route.params.id)
  const overviewQuery = useCopouchOverviewQuery({ walletAddress, chainId }, false)
  const wallets = overviewQuery.data?.wallets ?? []
  const loading = overviewQuery.isLoading && !overviewQuery.data
  const screenInvalidAccess = invalidAccess || isCopouchForbiddenError(overviewQuery.error)

  useEffect(() => {
    if (detailError && !isCopouchForbiddenError(detailError)) {
      presentError(detailError, {
        fallbackKey: "copouch.member.teamLoadFailed",
      })
    }
  }, [detailError, presentError])

  useEffect(() => {
    if (overviewQuery.error && !isCopouchForbiddenError(overviewQuery.error)) {
      presentError(overviewQuery.error, {
        fallbackKey: "copouch.member.teamLoadFailed",
      })
    }
  }, [overviewQuery.error, presentError])

  const otherWallets = useMemo(
    () => wallets.filter(wallet => wallet.id !== route.params.id && wallet.isCreator),
    [route.params.id, wallets],
  )

  return (
    <CopouchScaffold canGoBack onBack={navigation.goBack} title={t("copouch.member.teamImportTitle")}>
      <WalletGuard
        invalidBody={t("copouch.member.invalidBody")}
        invalidTitle={t("copouch.member.invalidTitle")}
        invalidAccess={screenInvalidAccess}
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
                  navigation.navigate("CopouchAddMemberForTeamSelectScreen", {
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

export function CopouchAddMemberForTeamSelectScreen({
  navigation,
  route,
}: CopouchStackScreenProps<"CopouchAddMemberForTeamSelectScreen">) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const currentAddress = useWalletStore(state => state.address)
  const queryClient = useQueryClient()
  const teamDetailQuery = useCopouchDetailQuery(route.params.teamId)
  const teamOwnersQuery = useCopouchOwnersQuery(route.params.teamId)
  const currentOwnersQuery = useCopouchOwnersQuery(route.params.id)
  const loading = teamDetailQuery.isLoading || teamOwnersQuery.isLoading || currentOwnersQuery.isLoading
  const invalidAccess =
    isCopouchForbiddenError(teamDetailQuery.error) ||
    isCopouchForbiddenError(teamOwnersQuery.error) ||
    isCopouchForbiddenError(currentOwnersQuery.error)
  const teamName = teamDetailQuery.data?.walletName || t("copouch.home.unnamedWallet")
  const teamOwners = (teamOwnersQuery.data ?? []) as CopouchOwner[]
  const currentOwners = (currentOwnersQuery.data ?? []) as CopouchOwner[]
  const [selectedAddress, setSelectedAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadError = teamDetailQuery.error ?? teamOwnersQuery.error ?? currentOwnersQuery.error

    if (!loadError || isCopouchForbiddenError(loadError)) {
      return
    }

    presentError(loadError, {
      fallbackKey: "copouch.member.teamLoadFailed",
    })
  }, [currentOwnersQuery.error, presentError, teamDetailQuery.error, teamOwnersQuery.error])

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
      await invalidateCopouchQueries(queryClient)
      showToast({ message: t("copouch.member.addSuccess"), tone: "success" })
      navigation.goBack()
    } catch (error) {
      presentMessage(resolveMutationMessage(t, error, "add"), {
        mode: "toast",
      })
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

import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Text, View } from "react-native"

import type { CopouchStackParamList } from "@/app/navigation/types"
import { CopouchScaffold } from "@/features/copouch/components/CopouchScaffold"
import {
  AvatarBadge,
  StatusBadge,
  WalletGuard,
  groupOwners,
  isEvmAddress,
  loadCopouchOwnersWithGuard,
  normalizeWalletAddress,
  resolveMemberBadgeKey,
  resolveMutationMessage,
  styles,
  useCopouchWalletDetail,
} from "@/features/copouch/screens/copouchOperationShared"
import {
  addCopouchOwner,
  getCopouchDetail,
  getCopouchOwners,
  preValidateCopouchAddOwner,
  preValidateCopouchRemoveOwner,
  removeCopouchOwner,
  syncCopouchOwners,
  type CopouchOwner,
} from "@/features/copouch/services/copouchApi"
import { useCopouchStore } from "@/features/copouch/store/useCopouchStore"
import { formatAddress } from "@/features/home/utils/format"
import { ActionRow } from "@/features/orders/components/OrdersUi"
import { PageEmpty, PrimaryButton, SectionCard } from "@/features/transfer/components/TransferUi"
import { ApiError } from "@/shared/errors"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useSocketStore } from "@/shared/store/useSocketStore"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppTextField } from "@/shared/ui/AppTextField"

type StackProps<T extends keyof CopouchStackParamList> = NativeStackScreenProps<CopouchStackParamList, T>

export function CopouchMemberScreen({ navigation, route }: StackProps<"CopouchMemberScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
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
    void loadAll().catch(error => {
      presentError(error, {
        fallbackKey: "copouch.member.loadFailed",
      })
    })
  }, [loadAll, presentError])

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

export function CopouchDeleteMemberScreen({ navigation, route }: StackProps<"CopouchDeleteMemberScreen">) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
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
    void loadAll().catch(error => {
      presentError(error, {
        fallbackKey: "copouch.member.loadFailed",
      })
    })
  }, [loadAll, presentError])

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
                  showToast({ message: t("copouch.member.removeSuccess"), tone: "success" })
                } catch (error) {
                try {
                  await syncCopouchOwners(route.params.id)
                  await loadAll()
                } catch {
                  // ignore sync errors and surface the original mutation error
                }

                  presentMessage(resolveMutationMessage(t, error, "remove"), {
                    mode: "toast",
                  })
                } finally {
                setDeletingWalletAddress("")
              }
            })()
          },
        },
      ])
    },
    [loadAll, presentMessage, route.params.id, t],
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

export function CopouchAddMemberScreen({ navigation, route }: StackProps<"CopouchAddMemberScreen">) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
  const { detail, loading, invalidAccess, reload } = useCopouchWalletDetail(route.params.id)
  const [walletAddress, setWalletAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void reload().catch(error => {
      presentError(error, {
        fallbackKey: "copouch.member.loadFailed",
      })
    })
  }, [presentError, reload])

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

export function CopouchAddMemberForTeamScreen({ navigation, route }: StackProps<"CopouchAddMemberForTeamScreen">) {
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const { showToast } = useToast()
  const wallets = useCopouchStore(state => state.wallets)
  const loading = useCopouchStore(state => state.loading)
  const loadOverview = useCopouchStore(state => state.loadOverview)
  const { invalidAccess, loading: detailLoading, reload } = useCopouchWalletDetail(route.params.id)

  useEffect(() => {
    void reload().catch(() => null)
    if (wallets.length === 0) {
      void loadOverview().catch(error => {
        presentError(error, {
          fallbackKey: "copouch.member.teamLoadFailed",
        })
      })
    }
  }, [loadOverview, presentError, reload, wallets.length])

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
}: StackProps<"CopouchAddMemberForTeamSelectScreen">) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const { showToast } = useToast()
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
    void load().catch(error => {
      presentError(error, {
        fallbackKey: "copouch.member.teamLoadFailed",
      })
    })
  }, [load, presentError])

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

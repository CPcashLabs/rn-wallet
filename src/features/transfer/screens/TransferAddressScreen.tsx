import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAddressBookStore } from "@/features/address-book/store/useAddressBookStore"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { PrimaryButton } from "@/features/transfer/components/TransferUi"
import { formatAddress, formatDateTime } from "@/features/home/utils/format"
import { getRecentTransferEntries, type TransferChannel } from "@/features/transfer/services/transferApi"
import { useTransferDraftStore, type TransferAddressSource } from "@/features/transfer/store/useTransferDraftStore"
import { buildAddressRegexes, extractTransferAddress, resolveTransferChainType } from "@/features/transfer/utils/address"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { scannerAdapter } from "@/shared/native"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { RootStackParamList, TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "TransferAddressScreen">
type RecentEntry = Awaited<ReturnType<typeof getRecentTransferEntries>>[number]

function isCancelledNativeAction(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = Reflect.get(error, "code")
  if (typeof code === "string" && code.toLowerCase().includes("cancel")) {
    return true
  }

  return error.name.toLowerCase().includes("cancel")
}

function toDraftChannel(route: Props["route"]): TransferChannel {
  return {
    key: `${route.params.channelType}:${route.params.receiveChainName}`,
    channelType: route.params.channelType,
    receiveChainName: route.params.receiveChainName,
    receiveChainFullName: route.params.receiveChainFullName,
    receiveChainColor: route.params.receiveChainColor,
    receiveChainLogo: route.params.receiveChainLogo,
    addressRegexes: route.params.addressRegexes,
    title: route.params.title,
    subtitle: route.params.receiveChainFullName,
    isRebate: route.params.isRebate,
  }
}

function resolveScanErrorMessage(error: Error, mode: "camera" | "image", t: (key: string) => string) {
  const code = Reflect.get(error, "code")

  if (code === "permission_denied") {
    return t("transfer.address.scanPermissionDenied")
  }

  if (code === "multiple_codes") {
    return t("transfer.address.scanMultiple")
  }

  if (code === "no_code") {
    return mode === "image" ? t("transfer.address.scanImageNoCode") : t("transfer.address.scanNoCode")
  }

  if (code === "image_parse_failed") {
    return t("transfer.address.scanImageParseFailed")
  }

  return t("transfer.address.scanFailed")
}

export function TransferAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const chainId = useWalletStore(state => state.chainId)
  const addressBookEntries = useAddressBookStore(state => state.entries)
  const addressBookLoading = useAddressBookStore(state => state.loading)
  const loadEntries = useAddressBookStore(state => state.loadEntries)
  const selectedAddressBookEntry = useAddressBookStore(state => state.selectedEntry)
  const setSelectedAddressBookEntry = useAddressBookStore(state => state.setSelectedEntry)
  const selectedChannel = useTransferDraftStore(state => state.selectedChannel)
  const draftRecipientAddress = useTransferDraftStore(state => state.recipientAddress)
  const setSelectedChannel = useTransferDraftStore(state => state.setSelectedChannel)
  const setRecipientAddress = useTransferDraftStore(state => state.setRecipientAddress)
  const targetChainType = useMemo(() => resolveTransferChainType(route.params.receiveChainName), [route.params.receiveChainName])
  const shouldReuseDraftAddress =
    selectedChannel?.channelType === route.params.channelType &&
    selectedChannel?.receiveChainName === route.params.receiveChainName
  const [address, setAddress] = useState(route.params.initialAddress ?? (shouldReuseDraftAddress ? draftRecipientAddress : ""))
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  const sendChainName = resolveChainNameById(chainId)
  const regexes = useMemo(
    () => buildAddressRegexes(route.params.addressRegexes, route.params.receiveChainName),
    [route.params.addressRegexes, route.params.receiveChainName],
  )
  const normalizedAddress = address.trim()
  const isAddressValid = useMemo(() => {
    if (!normalizedAddress) {
      return false
    }

    return regexes.some(regex => regex.test(normalizedAddress))
  }, [normalizedAddress, regexes])

  const addressBookMatch = useMemo(() => {
    const lookup = normalizedAddress.toLowerCase()
    if (!lookup) {
      return null
    }

    return addressBookEntries.find(item => item.walletAddress.toLowerCase() === lookup) ?? null
  }, [addressBookEntries, normalizedAddress])
  const addressError = useMemo(() => {
    if (!normalizedAddress) {
      return ""
    }

    return isAddressValid ? "" : t("transfer.address.invalid")
  }, [isAddressValid, normalizedAddress, t])

  const filteredAddressBook = useMemo(() => {
    return addressBookEntries.filter(item => item.chainType === targetChainType).slice(0, 8)
  }, [addressBookEntries, targetChainType])

  const addressSuggestions = useMemo(() => {
    const keyword = normalizedAddress.toLowerCase()
    if (!keyword) {
      return []
    }

    return filteredAddressBook
      .filter(item => {
        const nameMatched = item.name.toLowerCase().includes(keyword)
        const addressMatched = item.walletAddress.toLowerCase().includes(keyword)
        return (nameMatched || addressMatched) && item.walletAddress.toLowerCase() !== keyword
      })
      .slice(0, 5)
  }, [filteredAddressBook, normalizedAddress])

  useEffect(() => {
    setSelectedChannel(toDraftChannel(route))
  }, [
    route.params.addressRegexes,
    route.params.channelType,
    route.params.isRebate,
    route.params.receiveChainColor,
    route.params.receiveChainFullName,
    route.params.receiveChainLogo,
    route.params.receiveChainName,
    route.params.title,
    setSelectedChannel,
  ])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    let mounted = true

    void (async () => {
      setLoadingRecent(true)
      try {
        const result = await getRecentTransferEntries({
          sendChainName,
          receiveChainName: route.params.receiveChainName,
        })

        if (mounted) {
          setRecentEntries(result)
        }
      } catch {
        if (mounted) {
          setRecentEntries([])
        }
      } finally {
        if (mounted) {
          setLoadingRecent(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [route.params.receiveChainName, sendChainName])

  useFocusEffect(
    useCallback(() => {
      if (selectedAddressBookEntry) {
        const nextAddress = selectedAddressBookEntry.walletAddress.trim()
        setAddress(nextAddress)
        setRecipientAddress(nextAddress, "addressBook")
        setSelectedAddressBookEntry(null)
      }
    }, [selectedAddressBookEntry, setRecipientAddress, setSelectedAddressBookEntry]),
  )

  const syncAddress = useCallback(
    (value: string, source: TransferAddressSource) => {
      const nextValue = value.trim()
      setAddress(nextValue)
      setRecipientAddress(nextValue, source)
    },
    [setRecipientAddress],
  )

  const handleAddressChange = useCallback(
    (value: string) => {
      setAddress(value)
      setRecipientAddress(value, "manual")
    },
    [setRecipientAddress],
  )

  const handleOpenAddressBook = () => {
    navigation
      .getParent<NativeStackScreenProps<RootStackParamList>["navigation"]>()
      ?.navigate("AddressBookStack", {
        screen: "AddressBookListScreen",
        params: {
          mode: "select",
          chainType: targetChainType,
        },
      })
  }

  const handleAddAddressBook = () => {
    navigation
      .getParent<NativeStackScreenProps<RootStackParamList>["navigation"]>()
      ?.navigate("AddressBookStack", {
        screen: "AddressBookEditScreen",
        params: {
          initialAddress: normalizedAddress,
          chainType: targetChainType,
        },
      })
  }

  const handleScan = async (mode: "camera" | "image") => {
    const capability = scannerAdapter.getCapability(mode)
    if (!capability.supported) {
      Alert.alert(
        t("common.infoTitle"),
        mode === "camera" ? t("transfer.address.scanUnavailable") : t("transfer.address.scanImageUnavailable"),
      )
      return
    }

    const result = mode === "camera" ? await scannerAdapter.scan() : await scannerAdapter.scanImage()

    if (!result.ok) {
      if (isCancelledNativeAction(result.error)) {
        return
      }

      if (result.error instanceof NativeCapabilityUnavailableError) {
        Alert.alert(
          t("common.infoTitle"),
          mode === "camera" ? t("transfer.address.scanUnavailable") : t("transfer.address.scanImageUnavailable"),
        )
        return
      }

      Alert.alert(t("common.errorTitle"), resolveScanErrorMessage(result.error, mode, t))
      return
    }

    const nextAddress = extractTransferAddress(result.data.value, regexes)
    if (!nextAddress) {
      Alert.alert(t("common.errorTitle"), t("transfer.address.scanUnrecognized"))
      return
    }

    syncAddress(nextAddress, "scan")
  }

  const handleNext = () => {
    if (!isAddressValid) {
      Alert.alert(t("common.errorTitle"), t("transfer.address.invalid"))
      return
    }

    setRecipientAddress(normalizedAddress, "manual")
    navigation.navigate(route.params.channelType === "normal" ? "TransferOrderNormalScreen" : "TransferOrderScreen")
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.address.title")} scroll={false}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <View style={[styles.channelCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.channelHeader}>
            <View style={styles.channelMeta}>
              <View
                style={[
                  styles.channelDot,
                  { backgroundColor: route.params.receiveChainColor || theme.colors.primary },
                ]}
              />
              <View style={styles.channelTextGroup}>
                <Text style={[styles.channelTitle, { color: theme.colors.text }]}>{route.params.title}</Text>
                <Text style={[styles.channelSubtitle, { color: theme.colors.mutedText }]}>
                  {route.params.receiveChainFullName}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => navigation.navigate("SelectTokenScreen")} style={styles.linkButton}>
              <Text style={[styles.linkButtonText, { color: theme.colors.primary }]}>{t("transfer.address.changeChannel")}</Text>
            </Pressable>
          </View>
          {route.params.isRebate ? (
            <View style={styles.rebateBadge}>
              <Text style={styles.rebateBadgeText}>{t("transfer.address.rebateHint")}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.inputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t("transfer.address.label")}</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={handleAddressChange}
            placeholder={t("transfer.address.placeholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: addressError ? "#DC2626" : theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
            value={address}
          />
          <View style={styles.inlineActions}>
            <Pressable onPress={() => void handleScan("camera")} style={styles.inlineButton}>
              <Text style={[styles.inlineButtonText, { color: theme.colors.primary }]}>{t("transfer.address.scan")}</Text>
            </Pressable>
            <Pressable onPress={() => void handleScan("image")} style={styles.inlineButton}>
              <Text style={[styles.inlineButtonText, { color: theme.colors.primary }]}>{t("transfer.address.scanImage")}</Text>
            </Pressable>
            <Pressable onPress={handleOpenAddressBook} style={styles.inlineButton}>
              <Text style={[styles.inlineButtonText, { color: theme.colors.primary }]}>{t("transfer.address.fromAddressBook")}</Text>
            </Pressable>
          </View>
          <Text style={[styles.helperText, { color: addressError ? "#DC2626" : theme.colors.mutedText }]}>
            {addressError || t("transfer.address.helper")}
          </Text>
        </View>

        {addressSuggestions.length > 0 ? (
          <>
            <SectionTitle title={t("transfer.address.suggestions")} />
            <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {addressSuggestions.map(item => (
                <Pressable key={item.id} onPress={() => syncAddress(item.walletAddress, "suggestion")} style={styles.row}>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>{formatAddress(item.walletAddress)}</Text>
                  </View>
                  <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {normalizedAddress && !addressBookMatch && isAddressValid ? (
          <Pressable
            onPress={handleAddAddressBook}
            style={[styles.addAddressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.addAddressTitle, { color: theme.colors.text }]}>{t("transfer.address.addToAddressBook")}</Text>
            <Text style={[styles.addAddressBody, { color: theme.colors.mutedText }]}>{t("transfer.address.addToAddressBookHint")}</Text>
          </Pressable>
        ) : null}

        <View style={[styles.riskCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.riskTitle, { color: theme.colors.text }]}>{t("transfer.address.riskTitle")}</Text>
          <Text style={[styles.riskBody, { color: theme.colors.mutedText }]}>
            {addressBookMatch ? t("transfer.address.riskTrusted") : t("transfer.address.riskDefault")}
          </Text>
        </View>

        <SectionTitle title={t("transfer.address.recent")} />
        <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {loadingRecent ? (
            <ListEmpty body={t("transfer.address.loadingRecent")} title={t("common.loading")} />
          ) : recentEntries.length === 0 ? (
            <ListEmpty body={t("transfer.address.noRecent")} title={t("transfer.address.noRecentTitle")} />
          ) : (
            recentEntries.slice(0, 5).map(item => (
              <Pressable key={`${item.address}-${item.createdAt}`} onPress={() => syncAddress(item.address, "recent")} style={styles.row}>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{formatAddress(item.address)}</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>
                    {t(`transfer.address.direction.${item.direction}`)} · {item.coinName} · {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
              </Pressable>
            ))
          )}
        </View>

        <SectionTitle title={t("transfer.address.addressBook")} />
        <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {addressBookLoading && filteredAddressBook.length === 0 ? (
            <ListEmpty body={t("home.addressBook.loading")} title={t("common.loading")} />
          ) : filteredAddressBook.length === 0 ? (
            <ListEmpty body={t("transfer.address.noAddressBook")} title={t("transfer.address.noAddressBookTitle")} />
          ) : (
            filteredAddressBook.map(item => (
              <Pressable key={item.id} onPress={() => syncAddress(item.walletAddress, "addressBook")} style={styles.row}>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>{formatAddress(item.walletAddress)}</Text>
                </View>
                <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
              </Pressable>
            ))
          )}
        </View>

        <PrimaryButton disabled={!isAddressValid} label={t("transfer.address.next")} onPress={handleNext} />
      </ScrollView>
    </HomeScaffold>
  )
}

function SectionTitle(props: { title: string }) {
  const theme = useAppTheme()

  return <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{props.title}</Text>
}

function ListEmpty(props: { title: string; body: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  channelCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  channelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  channelMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  channelTextGroup: {
    flex: 1,
  },
  channelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  channelSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  linkButton: {
    alignSelf: "flex-start",
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rebateBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFF1E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rebateBadgeText: {
    fontSize: 11,
    color: "#E37318",
    fontWeight: "700",
  },
  inputCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlignVertical: "top",
    fontSize: 15,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  inlineButton: {
    paddingVertical: 4,
  },
  inlineButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  addAddressCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  addAddressTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  addAddressBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  riskCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  riskTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  riskBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E133",
  },
  rowMeta: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowArrow: {
    fontSize: 18,
  },
  emptyState: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
})

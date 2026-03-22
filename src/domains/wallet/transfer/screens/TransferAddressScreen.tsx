import React, { useCallback, useEffect, useMemo, useState } from "react"

import { Image } from "expo-image"
import { useFocusEffect } from "@react-navigation/native"
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { navigateRoot } from "@/app/navigation/navigationRef"
import { formatWalletAddress } from "@/domains/wallet/shared/utils/format"
import { PrimaryButton } from "@/shared/ui/AppFlowUi"
import { useAddressBookEntriesQuery } from "@/shared/address-book/addressBookQueries"
import { useAddressBookStore } from "@/shared/address-book/useAddressBookStore"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { useRecentTransferEntriesQuery } from "@/domains/wallet/transfer/queries/transferQueries"
import { type TransferChannel } from "@/domains/wallet/transfer/services/transferApi"
import { useTransferDraftStore, type TransferAddressSource } from "@/domains/wallet/transfer/store/useTransferDraftStore"
import { buildAddressRegexes, extractTransferAddress, resolveTransferChainType } from "@/domains/wallet/transfer/utils/address"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { errorCodeOf, resolveErrorMessage } from "@/shared/errors/presentation"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useDeferredValueCompat } from "@/shared/hooks/useDeferredValueCompat"
import { scannerAdapter } from "@/shared/native"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { SFSymbolIcon, type MaterialIconName, type SFSymbolName } from "@/shared/ui/SFSymbolIcon"

import type { TransferStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<TransferStackParamList, "TransferAddressScreen">

const RECENT_ENTRY_LIMIT = 3
const RECENT_AVATAR_TONES: Array<{
  lightBackground: string
  lightTint: string
  darkBackground: string
  darkTint: string
  symbol: SFSymbolName
  fallbackName: MaterialIconName
}> = [
  {
    lightBackground: "#CFF1CB",
    lightTint: "#35553B",
    darkBackground: "#233D2A",
    darkTint: "#B8E9BE",
    symbol: "person.fill",
    fallbackName: "account",
  },
  {
    lightBackground: "#CFE3FF",
    lightTint: "#1563E8",
    darkBackground: "#1E3657",
    darkTint: "#A8CCFF",
    symbol: "wallet.pass.fill",
    fallbackName: "wallet",
  },
  {
    lightBackground: "#E8E2DE",
    lightTint: "#465645",
    darkBackground: "#3A3532",
    darkTint: "#D9CDC6",
    symbol: "clock.fill",
    fallbackName: "clock-outline",
  },
  {
    lightBackground: "#FCE4C5",
    lightTint: "#8F5E04",
    darkBackground: "#4A3620",
    darkTint: "#FFD39B",
    symbol: "briefcase.fill",
    fallbackName: "briefcase",
  },
]

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
  return resolveErrorMessage(t, error, {
    fallbackKey: "transfer.address.scanFailed",
    codeMap: {
      permission_denied: "transfer.address.scanPermissionDenied",
      multiple_codes: "transfer.address.scanMultiple",
      image_parse_failed: "transfer.address.scanImageParseFailed",
    },
    preferApiMessage: false,
    preferErrorMessage: false,
    customResolver: currentError => {
      const code = errorCodeOf(currentError)
      if (code === "no_code") {
        return mode === "image" ? t("transfer.address.scanImageNoCode") : t("transfer.address.scanNoCode")
      }

      return undefined
    },
  })
}

function hashSeed(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

export function TransferAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const chainId = useWalletStore(state => state.chainId)
  const addressBookEntriesQuery = useAddressBookEntriesQuery()
  const addressBookEntries = addressBookEntriesQuery.data ?? []
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
  const deferredAddress = useDeferredValueCompat(address, 100)

  const sendChainName = resolveChainNameById(chainId)
  const recentEntriesQuery = useRecentTransferEntriesQuery({
    sendChainName,
    receiveChainName: route.params.receiveChainName,
  })
  const recentEntries = recentEntriesQuery.data ?? []
  const isRecentLoading = recentEntriesQuery.isLoading && !recentEntriesQuery.data
  const recentAddressBookEntryByAddress = useMemo(() => {
    return new Map(addressBookEntries.map(item => [item.walletAddress.toLowerCase(), item]))
  }, [addressBookEntries])
  const recentPreviewEntries = useMemo(() => recentEntries.slice(0, RECENT_ENTRY_LIMIT), [recentEntries])
  const regexes = useMemo(
    () => buildAddressRegexes(route.params.addressRegexes, route.params.receiveChainName),
    [route.params.addressRegexes, route.params.receiveChainName],
  )
  const normalizedAddress = address.trim()
  const deferredNormalizedAddress = deferredAddress.trim()
  const pageBackgroundColor = theme.colors.surfaceElevated ?? theme.colors.background
  const fieldBackgroundColor = theme.colors.surfaceMuted ?? theme.colors.backgroundMuted
  const cardBackgroundColor = theme.colors.surfaceMuted ?? theme.colors.surface
  const validateAddress = useCallback(
    (value: string) => {
      if (!value) {
        return false
      }

      return regexes.some(regex => regex.test(value))
    },
    [regexes],
  )
  const isAddressValid = useMemo(() => {
    if (!deferredNormalizedAddress) {
      return false
    }

    return validateAddress(deferredNormalizedAddress)
  }, [deferredNormalizedAddress, validateAddress])
  const canSubmit = useMemo(() => validateAddress(normalizedAddress), [normalizedAddress, validateAddress])

  const addressWarning = useMemo(() => {
    if (!deferredNormalizedAddress) {
      return ""
    }

    return isAddressValid ? "" : t("transfer.address.helper")
  }, [deferredNormalizedAddress, isAddressValid, t])

  const filteredAddressBook = useMemo(() => {
    return addressBookEntries.filter(item => item.chainType === targetChainType).slice(0, 8)
  }, [addressBookEntries, targetChainType])

  const addressSuggestions = useMemo(() => {
    const keyword = deferredNormalizedAddress.toLowerCase()
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
  }, [deferredNormalizedAddress, filteredAddressBook])

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
    const navigated = navigateRoot("AddressBookStack", {
      screen: "AddressBookListScreen",
      params: {
        mode: "select",
        chainType: targetChainType,
      },
    })

    if (!navigated) {
      presentMessage(t("transfer.address.loadAddressBookFailed"))
    }
  }

  const runScan = useCallback(
    async (mode: "camera" | "image") => {
      const capability = scannerAdapter.getCapability(mode)
      if (!capability.supported) {
        presentMessage(
          mode === "camera" ? t("transfer.address.scanUnavailable") : t("transfer.address.scanImageUnavailable"),
          {
            titleKey: "common.infoTitle",
          },
        )
        return
      }

      const result = mode === "camera" ? await scannerAdapter.scan() : await scannerAdapter.scanImage()

      if (!result.ok) {
        if (isCancelledNativeAction(result.error)) {
          return
        }

        if (result.error instanceof NativeCapabilityUnavailableError) {
          presentMessage(
            mode === "camera" ? t("transfer.address.scanUnavailable") : t("transfer.address.scanImageUnavailable"),
            {
              titleKey: "common.infoTitle",
            },
          )
          return
        }

        presentMessage(resolveScanErrorMessage(result.error, mode, t))
        return
      }

      const nextAddress = extractTransferAddress(result.data.value, regexes)
      if (!nextAddress) {
        presentMessage(t("transfer.address.scanUnrecognized"))
        return
      }

      syncAddress(nextAddress, "scan")
    },
    [presentMessage, regexes, syncAddress, t],
  )

  const handleOpenScanOptions = useCallback(() => {
    const cameraCapability = scannerAdapter.getCapability("camera")
    const imageCapability = scannerAdapter.getCapability("image")

    if (!cameraCapability.supported && !imageCapability.supported) {
      presentMessage(t("transfer.address.scanAllUnavailable"), {
        titleKey: "common.infoTitle",
      })
      return
    }

    if (cameraCapability.supported && !imageCapability.supported) {
      void runScan("camera")
      return
    }

    if (!cameraCapability.supported && imageCapability.supported) {
      void runScan("image")
      return
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("transfer.address.scan"), t("transfer.address.scanImage"), t("common.cancel")],
          cancelButtonIndex: 2,
        },
        buttonIndex => {
          if (buttonIndex === 0) {
            void runScan("camera")
            return
          }

          if (buttonIndex === 1) {
            void runScan("image")
          }
        },
      )
      return
    }

    Alert.alert(t("transfer.address.scan"), undefined, [
      {
        text: t("transfer.address.scan"),
        onPress: () => void runScan("camera"),
      },
      {
        text: t("transfer.address.scanImage"),
        onPress: () => void runScan("image"),
      },
      {
        style: "cancel",
        text: t("common.cancel"),
      },
    ])
  }, [presentMessage, runScan, t])

  const handleNext = useCallback(() => {
    if (!canSubmit) {
      presentMessage(t("transfer.address.invalid"))
      return
    }

    setRecipientAddress(normalizedAddress, "manual")
    navigation.navigate(route.params.channelType === "normal" ? "TransferOrderNormalScreen" : "TransferOrderScreen", {
      multisigWalletId: route.params.multisigWalletId,
    })
  }, [canSubmit, navigation, normalizedAddress, presentMessage, route.params.channelType, route.params.multisigWalletId, setRecipientAddress, t])

  return (
    <HomeScaffold
      backgroundColor={pageBackgroundColor}
      canGoBack
      headerBackgroundColor={pageBackgroundColor}
      onBack={navigation.goBack}
      right={
        <Pressable accessibilityLabel={t("transfer.address.scan")} hitSlop={10} onPress={handleOpenScanOptions} style={({ pressed }) => [styles.headerAction, pressed ? styles.headerActionPressed : null]}>
          <SFSymbolIcon color={theme.colors.primary} fallbackName="qrcode-scan" name="qrcode.viewfinder" size={22} weight="medium" />
        </Pressable>
      }
      scroll={false}
      title={t("transfer.address.title")}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.section}>
            <SectionTitle title={t("transfer.address.label")} />
            <View
              style={[
                styles.addressField,
                {
                  backgroundColor: fieldBackgroundColor,
                  borderColor: addressWarning ? theme.colors.dangerBorder : theme.colors.glassBorder,
                  shadowColor: theme.colors.shadow,
                  shadowOpacity: theme.isDark ? 0.18 : 0.04,
                },
              ]}
            >
              <SFSymbolIcon color={theme.colors.mutedText} fallbackName="magnify" name="magnifyingglass" size={18} weight="medium" />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={handleAddressChange}
                onSubmitEditing={() => {
                  if (canSubmit) {
                    handleNext()
                  }
                }}
                placeholder={t("transfer.address.placeholder")}
                placeholderTextColor={theme.colors.mutedText}
                returnKeyType="done"
                selectionColor={theme.colors.primary}
                style={[theme.typography.body, styles.addressInput, { color: theme.colors.text }]}
                value={address}
              />
              <Pressable
                accessibilityLabel={t("transfer.address.fromAddressBook")}
                hitSlop={8}
                onPress={handleOpenAddressBook}
                style={({ pressed }) => [styles.addressBookButton, { backgroundColor: theme.colors.primary }, pressed ? styles.iconButtonPressed : null]}
              >
                <SFSymbolIcon color="#FFFFFF" fallbackName="account-box" name="person.text.rectangle.fill" size={15} weight="medium" />
              </Pressable>
            </View>
            {addressWarning ? <Text style={[theme.typography.footnote, styles.fieldHint, { color: theme.colors.danger }]}>{addressWarning}</Text> : null}
          </View>

          {addressSuggestions.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle title={t("transfer.address.suggestions")} />
              <View style={styles.suggestionStack}>
                {addressSuggestions.map(item => (
                  <SuggestionCard
                    key={item.id}
                    backgroundColor={cardBackgroundColor}
                    onPress={() => syncAddress(item.walletAddress, "suggestion")}
                    subtitle={formatWalletAddress(item.walletAddress, 7, 4)}
                    title={item.name}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.recentSection}>
            <SectionTitle title={t("transfer.address.recent")} />
            <View style={styles.recentStack}>
              {isRecentLoading ? (
                <RecentEmptyState backgroundColor={cardBackgroundColor} body={t("transfer.address.loadingRecent")} title={t("common.loading")} />
              ) : recentPreviewEntries.length === 0 ? (
                <RecentEmptyState backgroundColor={cardBackgroundColor} body={t("transfer.address.noRecent")} title={t("transfer.address.noRecentTitle")} />
              ) : (
                recentPreviewEntries.map(item => {
                  const contactEntry = recentAddressBookEntryByAddress.get(item.address.toLowerCase())
                  const contactName = contactEntry?.name.trim()
                  const transferRecord = item.coinName
                    ? `${t(`transfer.address.direction.${item.direction}`)} · ${item.coinName}`
                    : t(`transfer.address.direction.${item.direction}`)

                  return (
                    <RecentTransferCard
                      avatarLabel={contactName ?? ""}
                      avatarUri={contactEntry?.avatar ?? ""}
                      key={`${item.address}-${item.createdAt}`}
                      address={item.address}
                      backgroundColor={cardBackgroundColor}
                      onPress={() => syncAddress(item.address, "recent")}
                      subtitle={contactName ? formatWalletAddress(item.address, 7, 4) : transferRecord}
                      title={contactName || formatWalletAddress(item.address, 10, 4)}
                    />
                  )
                })
              )}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: pageBackgroundColor, borderTopColor: theme.isDark ? theme.colors.border : "transparent" }]}>
          <PrimaryButton disabled={!canSubmit} label={`${t("transfer.address.next")}  →`} onPress={handleNext} style={styles.footerButton} />
        </View>
      </KeyboardAvoidingView>
    </HomeScaffold>
  )
}

function SectionTitle(props: { title: string }) {
  const theme = useAppTheme()

  return <Text style={[theme.typography.title3, styles.sectionTitle, { color: theme.colors.text }]}>{props.title}</Text>
}

function SuggestionCard(props: {
  title: string
  subtitle: string
  backgroundColor: string
  onPress: () => void
}) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.suggestionCard,
        {
          backgroundColor: props.backgroundColor,
          borderColor: theme.isDark ? theme.colors.border : "transparent",
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.14 : 0.025,
        },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={[styles.suggestionAvatar, { backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}16` }]}>
        <SFSymbolIcon color={theme.colors.primary} fallbackName="account-box" name="person.text.rectangle.fill" size={16} weight="medium" />
      </View>
      <View style={styles.suggestionBody}>
        <Text numberOfLines={1} style={[theme.typography.calloutEmphasized, styles.suggestionTitle, { color: theme.colors.text }]}>
          {props.title}
        </Text>
        <Text numberOfLines={1} style={[theme.typography.subheadline, styles.suggestionSubtitle, { color: theme.colors.mutedText }]}>
          {props.subtitle}
        </Text>
      </View>
      <Text style={[styles.suggestionChevron, { color: theme.colors.mutedText }]}>›</Text>
    </Pressable>
  )
}

function RecentTransferCard(props: {
  address: string
  avatarLabel: string
  avatarUri?: string
  title: string
  subtitle: string
  backgroundColor: string
  onPress: () => void
}) {
  const theme = useAppTheme()
  const avatarTone = useMemo(() => RECENT_AVATAR_TONES[hashSeed(props.address) % RECENT_AVATAR_TONES.length], [props.address])
  const avatarBackgroundColor = theme.isDark ? avatarTone.darkBackground : avatarTone.lightBackground
  const avatarTintColor = theme.isDark ? avatarTone.darkTint : avatarTone.lightTint

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.recentCard,
        {
          backgroundColor: props.backgroundColor,
          borderColor: theme.isDark ? theme.colors.border : "transparent",
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.16 : 0.03,
        },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <RecentTransferAvatar
        avatarLabel={props.avatarLabel}
        avatarUri={props.avatarUri}
        backgroundColor={avatarBackgroundColor}
        fallbackName={avatarTone.fallbackName}
        iconColor={avatarTintColor}
        name={avatarTone.symbol}
        size={48}
      />
      <View style={styles.recentTextBlock}>
        <Text numberOfLines={1} style={[theme.typography.calloutEmphasized, styles.recentTitle, { color: theme.colors.text }]}>
          {props.title}
        </Text>
        <Text numberOfLines={1} style={[theme.typography.subheadline, styles.recentSubtitle, { color: theme.colors.mutedText }]}>
          {props.subtitle}
        </Text>
      </View>
    </Pressable>
  )
}

function RecentTransferAvatar(props: {
  size: number
  avatarLabel: string
  avatarUri?: string
  backgroundColor: string
  iconColor: string
  name: SFSymbolName
  fallbackName: MaterialIconName
}) {
  const theme = useAppTheme()
  const [imageFailed, setImageFailed] = useState(false)
  const normalizedUri = props.avatarUri?.trim() || ""
  const fallbackLabel = props.avatarLabel.trim().slice(0, 1).toUpperCase()

  useEffect(() => {
    setImageFailed(false)
  }, [normalizedUri])

  if (normalizedUri && !imageFailed) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        onError={() => setImageFailed(true)}
        source={normalizedUri}
        style={[
          styles.recentAvatar,
          {
            width: props.size,
            height: props.size,
            borderRadius: props.size / 2,
            backgroundColor: props.backgroundColor,
          },
        ]}
        transition={0}
      />
    )
  }

  return (
    <View
      style={[
        styles.recentAvatar,
        {
          width: props.size,
          height: props.size,
          borderRadius: props.size / 2,
          backgroundColor: props.backgroundColor,
        },
      ]}
    >
      {fallbackLabel ? (
        <Text
          style={[
            theme.typography.subheadlineEmphasized,
            styles.recentAvatarLabel,
            {
              color: props.iconColor,
              fontSize: Math.max(15, Math.round(props.size * 0.34)),
              lineHeight: Math.max(18, Math.round(props.size * 0.4)),
            },
          ]}
        >
          {fallbackLabel}
        </Text>
      ) : (
        <SFSymbolIcon color={props.iconColor} fallbackName={props.fallbackName} name={props.name} size={20} weight="medium" />
      )}
    </View>
  )
}

function RecentEmptyState(props: {
  title: string
  body: string
  backgroundColor: string
}) {
  const theme = useAppTheme()

  return (
    <View style={[styles.emptyCard, { backgroundColor: props.backgroundColor, borderColor: theme.isDark ? theme.colors.border : "transparent" }]}>
      <Text style={[theme.typography.calloutEmphasized, styles.emptyTitle, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[theme.typography.footnote, styles.emptyBody, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 30,
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionPressed: {
    opacity: 0.82,
  },
  section: {
    gap: 14,
  },
  recentSection: {
    gap: 16,
  },
  sectionTitle: {},
  addressField: {
    minHeight: 64,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  addressInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  addressBookButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  fieldHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  suggestionStack: {
    gap: 12,
  },
  suggestionCard: {
    minHeight: 68,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  suggestionTitle: {},
  suggestionSubtitle: {},
  suggestionChevron: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "400",
  },
  recentStack: {
    gap: 12,
  },
  recentCard: {
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  recentAvatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  recentAvatarLabel: {
    textAlign: "center",
  },
  recentTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recentTitle: {},
  recentSubtitle: {},
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
  },
  emptyTitle: {},
  emptyBody: {},
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    minHeight: 52,
    borderRadius: 16,
  },
})

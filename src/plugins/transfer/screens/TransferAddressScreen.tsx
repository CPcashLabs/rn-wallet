import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useFocusEffect } from "@react-navigation/native"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAddressBookStore } from "@/features/address-book/store/useAddressBookStore"
import { navigateRoot } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { PrimaryButton } from "@/shared/ui/AppFlowUi"
import { formatAddress, formatDateTime } from "@/features/home/utils/format"
import { getRecentTransferEntries, type TransferChannel } from "@/plugins/transfer/services/transferApi"
import { useTransferDraftStore, type TransferAddressSource } from "@/plugins/transfer/store/useTransferDraftStore"
import { buildAddressRegexes, extractTransferAddress, resolveTransferChainType } from "@/plugins/transfer/utils/address"
import { resolveChainNameById } from "@/shared/api/walletAssets"
import { NativeCapabilityUnavailableError } from "@/shared/errors"
import { errorCodeOf, resolveErrorMessage } from "@/shared/errors/presentation"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useDeferredValueCompat } from "@/shared/hooks/useDeferredValueCompat"
import { usePluginRuntime } from "@/shared/plugins/PluginRuntimeProvider"
import { scannerAdapter } from "@/shared/native"
import { useWalletStore } from "@/shared/store/useWalletStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { TransferStackParamList } from "@/app/navigation/types"

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

export function TransferAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentMessage } = useErrorPresenter()
  const pluginRuntime = usePluginRuntime()
  const chainId = useWalletStore(state => state.chainId)
  const addressBookEntries = useAddressBookStore(state => state.entries)
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
  const deferredAddress = useDeferredValueCompat(address, 100)
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [isRecentLoading, setIsRecentLoading] = useState(true)

  const sendChainName = resolveChainNameById(chainId)
  const regexes = useMemo(
    () => buildAddressRegexes(route.params.addressRegexes, route.params.receiveChainName),
    [route.params.addressRegexes, route.params.receiveChainName],
  )
  const normalizedAddress = address.trim()
  const deferredNormalizedAddress = deferredAddress.trim()
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

  const addressBookMatch = useMemo(() => {
    const lookup = deferredNormalizedAddress.toLowerCase()
    if (!lookup) {
      return null
    }

    return addressBookEntries.find(item => item.walletAddress.toLowerCase() === lookup) ?? null
  }, [addressBookEntries, deferredNormalizedAddress])
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

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    let mounted = true

    void (async () => {
      setIsRecentLoading(true)
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
          setIsRecentLoading(false)
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
    if (pluginRuntime?.host) {
      void (async () => {
        const result = await pluginRuntime.host.openAddressBook({
          chainType: targetChainType,
        })

        if (result.action === "selected") {
          syncAddress(result.entry.walletAddress, "addressBook")
        }
      })().catch(error => {
        presentMessage(resolveErrorMessage(t, error, {
          fallbackKey: "transfer.address.loadAddressBookFailed",
          preferApiMessage: false,
          preferErrorMessage: true,
        }))
      })

      return
    }

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

  const handleAddAddressBook = () => {
    const navigated = navigateRoot("AddressBookStack", {
      screen: "AddressBookEditScreen",
      params: {
        initialAddress: normalizedAddress,
        chainType: targetChainType,
      },
    })

    if (!navigated) {
      presentMessage(t("transfer.address.loadAddressBookFailed"))
    }
  }

  const handleScan = async (mode: "camera" | "image") => {
    if (pluginRuntime?.host) {
      try {
        const result = await pluginRuntime.host.scanCode({ mode })
        if (!result) {
          return
        }

        const nextAddress = extractTransferAddress(result.value, regexes)
        if (!nextAddress) {
          presentMessage(t("transfer.address.scanUnrecognized"))
          return
        }

        syncAddress(nextAddress, "scan")
      } catch (error) {
        if (error instanceof Error && isCancelledNativeAction(error)) {
          return
        }

        if (error instanceof NativeCapabilityUnavailableError) {
          presentMessage(
            mode === "camera" ? t("transfer.address.scanUnavailable") : t("transfer.address.scanImageUnavailable"),
            {
              titleKey: "common.infoTitle",
            },
          )
          return
        }

        presentMessage(resolveScanErrorMessage(error instanceof Error ? error : new Error("Scanning failed"), mode, t))
      }

      return
    }

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
  }

  const handleNext = () => {
    if (!canSubmit) {
      presentMessage(t("transfer.address.invalid"))
      return
    }

    setRecipientAddress(normalizedAddress, "manual")
    navigation.navigate(route.params.channelType === "normal" ? "TransferOrderNormalScreen" : "TransferOrderScreen")
  }

  return (
    <HomeScaffold canGoBack onBack={navigation.goBack} title={t("transfer.address.title")} scroll={false}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppTextField
            autoCapitalize="none"
            autoCorrect={false}
            backgroundTone="background"
            error={addressWarning}
            label={t("transfer.address.label")}
            multiline
            onChangeText={handleAddressChange}
            placeholder={t("transfer.address.placeholder")}
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
        </View>

        {addressSuggestions.length > 0 ? (
          <>
            <SectionTitle title={t("transfer.address.suggestions")} />
            <AppListCard>
              {addressSuggestions.map((item, index) => (
                <AppListRow
                  key={item.id}
                  hideDivider={index === addressSuggestions.length - 1}
                  onPress={() => syncAddress(item.walletAddress, "suggestion")}
                  subtitle={formatAddress(item.walletAddress)}
                  subtitleStyle={styles.rowSubtitle}
                  title={item.name}
                  titleStyle={styles.rowTitle}
                />
              ))}
            </AppListCard>
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
          <Text style={[styles.riskBody, { color: theme.colors.mutedText }]}>{t("transfer.address.riskDefault")}</Text>
        </View>

        <SectionTitle title={t("transfer.address.recent")} />
        <AppListCard>
          {isRecentLoading ? (
            <AppEmptyState body={t("transfer.address.loadingRecent")} title={t("common.loading")} />
          ) : recentEntries.length === 0 ? (
            <AppEmptyState body={t("transfer.address.noRecent")} title={t("transfer.address.noRecentTitle")} />
          ) : (
            recentEntries.slice(0, 5).map((item, index, source) => (
              <AppListRow
                key={`${item.address}-${item.createdAt}`}
                hideDivider={index === source.length - 1}
                onPress={() => syncAddress(item.address, "recent")}
                subtitle={`${t(`transfer.address.direction.${item.direction}`)} · ${item.coinName} · ${formatDateTime(item.createdAt)}`}
                subtitleStyle={styles.rowSubtitle}
                title={formatAddress(item.address)}
                titleStyle={styles.rowTitle}
              />
            ))
          )}
        </AppListCard>

        <PrimaryButton disabled={!canSubmit} label={t("transfer.address.next")} onPress={handleNext} />
      </ScrollView>
    </HomeScaffold>
  )
}

function SectionTitle(props: { title: string }) {
  const theme = useAppTheme()

  return <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{props.title}</Text>
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
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
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
})

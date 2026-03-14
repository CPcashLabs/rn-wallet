import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { FlatList, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { usePreventRemove } from "@react-navigation/native"

import type { AddressBookEntry } from "@/features/address-book/services/addressBookApi"
import { useAddressBookStore } from "@/features/address-book/store/useAddressBookStore"
import {
  clearAddressBookCapabilityRequest,
  closeAddressBookCapabilityRequest,
  resolveAddressBookCapabilitySelection,
} from "@/app/plugins/addressBookCapability"
import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress } from "@/features/home/utils/format"
import { useDeferredValueCompat } from "@/shared/hooks/useDeferredValueCompat"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppListRow } from "@/shared/ui/AppList"
import { AppTextField } from "@/shared/ui/AppTextField"

import type { AddressBookStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AddressBookStackParamList, "AddressBookListScreen">

export function AddressBookListScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const entries = useAddressBookStore(state => state.entries)
  const loading = useAddressBookStore(state => state.loading)
  const refreshing = useAddressBookStore(state => state.refreshing)
  const loadEntries = useAddressBookStore(state => state.loadEntries)
  const refreshEntries = useAddressBookStore(state => state.refreshEntries)
  const setSelectedEntry = useAddressBookStore(state => state.setSelectedEntry)
  const [keyword, setKeyword] = useState("")
  const deferredKeyword = useDeferredValueCompat(keyword)

  const mode = route.params?.mode ?? "manage"
  const chainType = route.params?.chainType
  const requestId = route.params?.requestId
  const shouldInterceptClose = mode === "select" && Boolean(requestId)
  const skipPreventRemoveRef = useRef(false)

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const filteredEntries = useMemo(() => {
    const normalized = deferredKeyword.trim().toLowerCase()

    return entries.filter(entry => {
      if (chainType && entry.chainType !== chainType) {
        return false
      }

      if (!normalized) {
        return true
      }

      return (
        entry.name.toLowerCase().includes(normalized) ||
        entry.walletAddress.toLowerCase().includes(normalized) ||
        entry.chainType.toLowerCase().includes(normalized)
      )
    })
  }, [chainType, deferredKeyword, entries])

  const handleRowPress = useCallback((id: string) => {
    const entry = entries.find(item => item.id === id)
    if (!entry) {
      return
    }

    if (mode === "select") {
      setSelectedEntry(entry)
      resolveAddressBookCapabilitySelection(requestId, entry)
      skipPreventRemoveRef.current = true
      navigation.goBack()
      return
    }

    navigation.navigate("AddressBookEditScreen", { id })
  }, [entries, mode, navigation, requestId, setSelectedEntry])

  const handleAddPress = useCallback(() => {
    navigation.navigate("AddressBookEditScreen", {
      chainType,
    })
  }, [chainType, navigation])

  const handleClearSelection = useCallback(() => {
    setSelectedEntry(null)
    clearAddressBookCapabilityRequest(requestId)
    skipPreventRemoveRef.current = true
    navigation.goBack()
  }, [navigation, requestId, setSelectedEntry])

  const handleBack = useCallback(() => {
    closeAddressBookCapabilityRequest(requestId)
    skipPreventRemoveRef.current = true
    navigation.goBack()
  }, [navigation, requestId])

  usePreventRemove(shouldInterceptClose, event => {
    if (skipPreventRemoveRef.current) {
      skipPreventRemoveRef.current = false
      navigation.dispatch(event.data.action)
      return
    }

    closeAddressBookCapabilityRequest(requestId)
    navigation.dispatch(event.data.action)
  })

  useEffect(() => {
    return () => {
      if (shouldInterceptClose) {
        closeAddressBookCapabilityRequest(requestId)
      }
    }
  }, [requestId, shouldInterceptClose])

  const renderEntry = useCallback(
    ({ item, index }: { item: AddressBookEntry; index: number }) => (
      <AppListRow
        hideDivider={index === filteredEntries.length - 1}
        left={
          <View style={[styles.chainBadge, { backgroundColor: item.chainType === "TRON" ? "#FFF1E9" : "#EBF4FF" }]}>
            <Text style={[styles.chainBadgeText, { color: item.chainType === "TRON" ? "#E37318" : "#1D4ED8" }]}>
              {item.chainType}
            </Text>
          </View>
        }
        onPress={() => handleRowPress(item.id)}
        subtitle={formatAddress(item.walletAddress)}
        subtitleStyle={styles.rowAddress}
        title={item.name}
        titleStyle={styles.rowName}
      />
    ),
    [filteredEntries.length, handleRowPress],
  )

  const title = mode === "select" ? t("home.addressBook.selectTitle") : t("home.addressBook.title")

  return (
    <HomeScaffold
      canGoBack
      onBack={handleBack}
      title={title}
      right={
        <HeaderTextAction
          disabled={refreshing}
          label={refreshing ? t("common.loading") : t("home.addressBook.refresh")}
          onPress={() => void refreshEntries()}
        />
      }
      scroll={false}
    >
      <View style={styles.page}>
        <AppTextField
          autoCapitalize="none"
          backgroundTone="surface"
          containerStyle={styles.searchField}
          onChangeText={setKeyword}
          placeholder={t("home.addressBook.searchPlaceholder")}
          value={keyword}
        />

        {chainType ? (
          <View style={[styles.modeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modeText, { color: theme.colors.text }]}>
              {t("home.addressBook.filteredByChain", { chain: chainType })}
            </Text>
          </View>
        ) : null}

        <FlatList
          data={filteredEntries}
          initialNumToRender={12}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={item => item.id}
          ListEmptyComponent={
            loading && entries.length === 0 ? (
              <AppEmptyState body={t("home.addressBook.loading")} title={t("common.loading")} />
            ) : (
              <AppEmptyState
                body={keyword ? t("home.addressBook.searchEmpty") : t("home.addressBook.emptyBody")}
                title={keyword ? t("home.addressBook.searchEmptyTitle") : t("home.addressBook.emptyTitle")}
              />
            )
          }
          maxToRenderPerBatch={16}
          removeClippedSubviews
          renderItem={renderEntry}
          showsVerticalScrollIndicator={false}
          style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          windowSize={8}
          contentContainerStyle={filteredEntries.length === 0 ? styles.listCardEmptyContent : undefined}
        />

        <View style={styles.footerActions}>
          <AppButton label={mode === "select" ? t("home.addressBook.addNew") : t("home.addressBook.add")} onPress={handleAddPress} />

          {mode === "select" ? (
            <AppButton
              label={t("home.addressBook.clearSelection")}
              onPress={handleClearSelection}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  searchField: {
    backgroundColor: "transparent",
  },
  modeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  listCardEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  footerActions: {
    gap: 12,
  },
  chainBadge: {
    minWidth: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chainBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowName: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowAddress: {
    fontSize: 13,
  },
})

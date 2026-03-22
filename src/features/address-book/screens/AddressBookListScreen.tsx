import React, { useCallback, useMemo, useState } from "react"

import { FlatList, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { AddressBookEntry } from "@/shared/address-book/addressBookApi"
import { useAddressBookEntriesQuery } from "@/shared/address-book/addressBookQueries"
import { useAddressBookStore } from "@/shared/address-book/useAddressBookStore"
import { useDeferredValueCompat } from "@/shared/hooks/useDeferredValueCompat"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"
import { AppEmptyState } from "@/shared/ui/AppEmptyState"
import { AppListRow } from "@/shared/ui/AppList"
import { AppTextField } from "@/shared/ui/AppTextField"
import { HeaderTextAction, HomeScaffold } from "@/shared/ui/HomeScaffold"
import { formatAddress } from "@/shared/utils/format"

import type { AddressBookStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AddressBookStackParamList, "AddressBookListScreen">

export function AddressBookListScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const entriesQuery = useAddressBookEntriesQuery()
  const entries = entriesQuery.data ?? []
  const loading = entriesQuery.isLoading && !entriesQuery.data
  const refreshing = entriesQuery.isRefetching
  const setSelectedEntry = useAddressBookStore(state => state.setSelectedEntry)
  const [keyword, setKeyword] = useState("")
  const deferredKeyword = useDeferredValueCompat(keyword)

  const mode = route.params?.mode ?? "manage"
  const chainType = route.params?.chainType

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
      navigation.goBack()
      return
    }

    navigation.navigate("AddressBookEditScreen", { id })
  }, [entries, mode, navigation, setSelectedEntry])

  const handleAddPress = useCallback(() => {
    navigation.navigate("AddressBookEditScreen", {
      chainType,
    })
  }, [chainType, navigation])

  const renderEntry = useCallback(
    ({ item, index }: { item: AddressBookEntry; index: number }) => (
      <AppListRow
        hideDivider={index === filteredEntries.length - 1}
        left={
          <View style={[styles.chainBadge, { backgroundColor: item.chainType === "TRON" ? theme.colors.warningSoft : theme.colors.infoSoft }]}>
            <Text style={[styles.chainBadgeText, { color: item.chainType === "TRON" ? theme.colors.warning : theme.colors.info }]}>
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
    [filteredEntries.length, handleRowPress, theme.colors.info, theme.colors.infoSoft, theme.colors.warning, theme.colors.warningSoft],
  )

  const title = mode === "select" ? t("home.addressBook.selectTitle") : t("home.addressBook.title")

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={title}
      right={
        <HeaderTextAction
          disabled={refreshing}
          label={refreshing ? t("common.loading") : t("home.addressBook.refresh")}
          onPress={() => void entriesQuery.refetch()}
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

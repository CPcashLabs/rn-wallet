import React, { useEffect, useMemo, useState } from "react"

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { formatAddress } from "@/features/home/utils/format"
import { useUserAddressBookStore } from "@/shared/store/useUserAddressBookStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { AddressBookStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AddressBookStackParamList, "AddressBookListScreen">

export function AddressBookListScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const entries = useUserAddressBookStore(state => state.entries)
  const loading = useUserAddressBookStore(state => state.loading)
  const refreshing = useUserAddressBookStore(state => state.refreshing)
  const loadEntries = useUserAddressBookStore(state => state.loadEntries)
  const refreshEntries = useUserAddressBookStore(state => state.refreshEntries)
  const setSelectedEntry = useUserAddressBookStore(state => state.setSelectedEntry)
  const [keyword, setKeyword] = useState("")

  const mode = route.params?.mode ?? "manage"
  const chainType = route.params?.chainType

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const filteredEntries = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()

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
  }, [chainType, entries, keyword])

  const handleRowPress = (id: string) => {
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
  }

  const handleAddPress = () => {
    navigation.navigate("AddressBookEditScreen", {
      chainType,
    })
  }

  const title = mode === "select" ? t("home.addressBook.selectTitle") : t("home.addressBook.title")

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={title}
      right={
        <Pressable onPress={() => void refreshEntries()} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.colors.primary }]}>
            {refreshing ? t("common.loading") : t("home.addressBook.refresh")}
          </Text>
        </Pressable>
      }
      scroll={false}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setKeyword}
            placeholder={t("home.addressBook.searchPlaceholder")}
            placeholderTextColor={theme.colors.mutedText}
            style={[
              styles.searchInput,
              {
                color: theme.colors.text,
              },
            ]}
            value={keyword}
          />
        </View>

        {chainType ? (
          <View style={[styles.modeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modeText, { color: theme.colors.text }]}>
              {t("home.addressBook.filteredByChain", { chain: chainType })}
            </Text>
          </View>
        ) : null}

        <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {loading && entries.length === 0 ? (
            <EmptyState body={t("home.addressBook.loading")} title={t("common.loading")} />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              body={keyword ? t("home.addressBook.searchEmpty") : t("home.addressBook.emptyBody")}
              title={keyword ? t("home.addressBook.searchEmptyTitle") : t("home.addressBook.emptyTitle")}
            />
          ) : (
            filteredEntries.map(entry => (
              <Pressable key={entry.id} onPress={() => handleRowPress(entry.id)} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.chainBadge, { backgroundColor: entry.chainType === "TRON" ? "#FFF1E9" : "#EBF4FF" }]}>
                    <Text style={[styles.chainBadgeText, { color: entry.chainType === "TRON" ? "#E37318" : "#1D4ED8" }]}>
                      {entry.chainType}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowName, { color: theme.colors.text }]}>{entry.name}</Text>
                    <Text style={[styles.rowAddress, { color: theme.colors.mutedText }]} numberOfLines={1}>
                      {formatAddress(entry.walletAddress)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text>
              </Pressable>
            ))
          )}
        </View>

        <Pressable onPress={handleAddPress} style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.addButtonText}>
            {mode === "select" ? t("home.addressBook.addNew") : t("home.addressBook.add")}
          </Text>
        </Pressable>

        {mode === "select" ? (
          <Pressable
            onPress={() => {
              setSelectedEntry(null)
              navigation.goBack()
            }}
            style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
              {t("home.addressBook.clearSelection")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </HomeScaffold>
  )
}

function EmptyState(props: { title: string; body: string }) {
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
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    minHeight: 44,
    fontSize: 14,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#CBD5E133",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
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
  rowMeta: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowAddress: {
    fontSize: 13,
  },
  rowArrow: {
    fontSize: 18,
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
})

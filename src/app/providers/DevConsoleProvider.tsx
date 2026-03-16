import React, { useEffect, useMemo, useState, type PropsWithChildren } from "react"

import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import type { DevConsoleEntry, DevConsoleFilter } from "@/shared/logging/devConsole"
import {
  clearDevConsoleEntries,
  installDevConsoleCapture,
  useDevConsoleEntries,
} from "@/shared/logging/devConsole"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const FILTERS: DevConsoleFilter[] = ["all", "error", "warn", "runtime"]

export function DevConsoleProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const [filter, setFilter] = useState<DevConsoleFilter>("all")
  const entries = useDevConsoleEntries()

  useEffect(() => {
    installDevConsoleCapture()
  }, [])

  const filteredEntries = useMemo(
    () => filterEntries(entries, filter),
    [entries, filter],
  )

  const renderItem = ({ item }: { item: DevConsoleEntry }) => (
    <View
      style={[
        styles.logCard,
        {
          backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.logHeader}>
        <View
          style={[
            styles.levelBadge,
            {
              backgroundColor: getLevelBackgroundColor(item.level, theme),
            },
          ]}
        >
          <Text
            style={[
              styles.levelBadgeLabel,
              { color: getLevelTextColor(item.level, theme) },
            ]}
          >
            {t(`settingsHub.developerConsole.levels.${item.level}`)}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: theme.colors.mutedText }]}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      <Text selectable style={[styles.logMessage, { color: theme.colors.text }]}>
        {item.message}
      </Text>
    </View>
  )

  return (
    <>
      {children}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          pointerEvents="box-none"
          style={[
            styles.triggerSlot,
            {
              bottom: Math.max(insets.bottom, 16) + 18,
              right: 16,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={t("settingsHub.developerConsole.open")}
            onPress={() => setVisible(true)}
            style={[
              styles.triggerButton,
              {
                backgroundColor: theme.colors.brand,
                borderColor: theme.colors.glassBorder ?? theme.colors.border,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <Text
              style={[
                styles.triggerLabel,
                { color: theme.colors.brandInverse },
              ]}
            >
              DEV
            </Text>
            {entries.length > 0 ? (
              <View
                style={[
                  styles.triggerCount,
                  {
                    backgroundColor: theme.colors.danger,
                  },
                ]}
              >
                <Text style={styles.triggerCountLabel}>
                  {Math.min(entries.length, 99)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <View style={styles.modalRoot}>
          <Pressable
            onPress={() => setVisible(false)}
            style={styles.backdrop}
          />
          <SafeAreaView
            edges={["top", "bottom"]}
            style={styles.sheetSafeArea}
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor:
                    theme.colors.backgroundMuted ?? theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text
                    style={[styles.sheetTitle, { color: theme.colors.text }]}
                  >
                    {t("settingsHub.developerConsole.title")}
                  </Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: theme.colors.mutedText },
                    ]}
                  >
                    {t("settingsHub.developerConsole.summaryBody")}
                  </Text>
                </View>
                <View style={styles.sheetActions}>
                  <Pressable
                    disabled={entries.length === 0}
                    onPress={clearDevConsoleEntries}
                    style={[
                      styles.headerAction,
                      {
                        backgroundColor:
                          theme.colors.surfaceMuted ?? theme.colors.surface,
                        borderColor: theme.colors.border,
                        opacity: entries.length === 0 ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headerActionLabel,
                        { color: theme.colors.text },
                      ]}
                    >
                      {t("settingsHub.developerConsole.clear")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setVisible(false)}
                    style={[
                      styles.headerAction,
                      {
                        backgroundColor:
                          theme.colors.surfaceMuted ?? theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headerActionLabel,
                        { color: theme.colors.text },
                      ]}
                    >
                      {t("common.close")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.filterRow}>
                {FILTERS.map(item => {
                  const selected = item === filter
                  const count = filterEntries(entries, item).length

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setFilter(item)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primarySoft ??
                              `${theme.colors.primary}14`
                            : theme.colors.surfaceMuted ?? theme.colors.surface,
                          borderColor: selected
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipLabel,
                          {
                            color: selected
                              ? theme.colors.primary
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {t(`settingsHub.developerConsole.filters.${item}`)}
                      </Text>
                      <Text
                        style={[
                          styles.filterChipCount,
                          {
                            color: selected
                              ? theme.colors.primary
                              : theme.colors.mutedText,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              <FlatList
                contentContainerStyle={
                  filteredEntries.length === 0
                    ? styles.emptyListContent
                    : styles.listContent
                }
                data={filteredEntries}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        backgroundColor:
                          theme.colors.surfaceElevated ?? theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.emptyTitle, { color: theme.colors.text }]}
                    >
                      {t("settingsHub.developerConsole.emptyTitle")}
                    </Text>
                    <Text
                      style={[
                        styles.emptyBody,
                        { color: theme.colors.mutedText },
                      ]}
                    >
                      {t("settingsHub.developerConsole.emptyBody")}
                    </Text>
                  </View>
                }
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  )
}

function filterEntries(entries: DevConsoleEntry[], filter: DevConsoleFilter) {
  switch (filter) {
    case "error":
      return entries.filter(entry => entry.level === "error")
    case "warn":
      return entries.filter(entry => entry.level === "warn")
    case "runtime":
      return entries.filter(
        entry =>
          entry.level === "log" ||
          entry.level === "info" ||
          entry.level === "debug",
      )
    default:
      return entries
  }
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function getLevelBackgroundColor(
  level: DevConsoleEntry["level"],
  theme: ReturnType<typeof useAppTheme>,
) {
  switch (level) {
    case "error":
      return theme.colors.dangerSoft
    case "warn":
      return theme.colors.warningSoft
    default:
      return theme.colors.primarySoft ?? `${theme.colors.primary}14`
  }
}

function getLevelTextColor(
  level: DevConsoleEntry["level"],
  theme: ReturnType<typeof useAppTheme>,
) {
  switch (level) {
    case "error":
      return theme.colors.danger
    case "warn":
      return theme.colors.warning
    default:
      return theme.colors.primary
  }
}

const styles = StyleSheet.create({
  triggerSlot: {
    position: "absolute",
  },
  triggerButton: {
    minWidth: 58,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  triggerLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  triggerCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -5,
    right: -5,
  },
  triggerCountLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    minHeight: "58%",
    maxHeight: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  sheetHeader: {
    gap: 12,
  },
  sheetHeaderCopy: {
    gap: 6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerAction: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  logCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  levelBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timestamp: {
    fontSize: 12,
  },
  logMessage: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Menlo",
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
})

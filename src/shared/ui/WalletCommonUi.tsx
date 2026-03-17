import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppListRow } from "@/shared/ui/AppList"
import { SectionCard } from "@/shared/ui/AppFlowUi"

export function WalletFilterChip(props: {
  label: string
  active?: boolean
  onPress: () => void
}) {
  const theme = useAppTheme()

  return (
    <Pressable
      onPress={props.onPress}
      style={[
        styles.chip,
        {
          borderColor: props.active ? theme.colors.primary : theme.colors.glassBorder,
          backgroundColor: props.active ? theme.colors.primarySoft : theme.colors.glass,
          shadowColor: theme.colors.shadow,
          shadowOpacity: props.active ? (theme.isDark ? 0.14 : 0.08) : theme.isDark ? 0.08 : 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: props.active ? 2 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: props.active ? theme.colors.primary : theme.colors.text }]}>{props.label}</Text>
    </Pressable>
  )
}

function WalletSummaryMetric(props: {
  label: string
  value: string
}) {
  const theme = useAppTheme()

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.glassBorder,
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.colors.mutedText }]}>{props.label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{props.value}</Text>
    </View>
  )
}

export function WalletSummaryGrid(props: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <SectionCard>
      <View style={styles.metricGrid}>
        {props.items.map(item => (
          <WalletSummaryMetric key={item.label} label={item.label} value={item.value} />
        ))}
      </View>
    </SectionCard>
  )
}

export function WalletActionRow(props: {
  label: string
  body?: string
  onPress: () => void
}) {
  return <AppListRow onPress={props.onPress} subtitle={props.body} title={props.label} />
}

export const FilterChip = WalletFilterChip
export const SummaryGrid = WalletSummaryGrid
export const ActionRow = WalletActionRow

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metric: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  metricGrid: {
    gap: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
})

import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { HelpStackParamList, SettingsStackParamList } from "@/app/navigation/types"
import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import type { ExchangeRateItem } from "@/features/settings/services/settingsApi"
import type { GuideSection } from "@/features/settings/utils/settingsHub"
import { useUserStore } from "@/shared/store/useUserStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard, APP_LIST_ROW_MIN_HEIGHT } from "@/shared/ui/AppCard"
import { AppButton } from "@/shared/ui/AppButton"
import { AppGlyph, type AppGlyphName } from "@/shared/ui/AppGlyph"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"

export type StackProps<T extends keyof SettingsStackParamList> = NativeStackScreenProps<SettingsStackParamList, T>
export type HelpStackProps<T extends keyof HelpStackParamList> = NativeStackScreenProps<HelpStackParamList, T>

export type GuideScreenName =
  | "WalletGuideDetailScreen"
  | "FAQGuideDetailScreen"
  | "KnowledgeGuideDetailScreen"
  | "SafetyGuideDetailScreen"

export type GuideListScreenProps = NativeStackScreenProps<HelpStackParamList, GuideScreenName> & {
  section: GuideSection
  titleKey: string
}

export const DEFAULT_RATES: ExchangeRateItem[] = [
  { currency: "USD", value: "1", symbol: "$" },
  { currency: "CNY", value: "7.2", symbol: "¥" },
  { currency: "EUR", value: "0.92", symbol: "€" },
]

export const LOCAL_NODE_MAP: Record<string, string[]> = {
  "199": ["https://rpc.bt.io/", "https://rpc.bittorrentchain.io"],
  "1029": ["https://pre-rpc.bt.io/", "https://pre-rpc.bittorrentchain.io/"],
}

export function Card(props: { children: React.ReactNode }) {
  return <AppCard>{props.children}</AppCard>
}

export function ListCard(props: { children: React.ReactNode }) {
  return <AppListCard>{props.children}</AppListCard>
}

export function SectionHeader(props: { title: string; detail?: string }) {
  const theme = useAppTheme()

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderTitle, { color: theme.colors.mutedText }]}>{props.title}</Text>
      {props.detail ? <Text style={[styles.sectionHeaderDetail, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
    </View>
  )
}

export function Row(props: {
  label: string
  detail?: string
  onPress?: () => void
  children?: React.ReactNode
  icon?: AppGlyphName
  selected?: boolean
  hideDivider?: boolean
}) {
  const theme = useAppTheme()
  const accessory =
    props.children !== undefined ? (
      props.children
    ) : props.detail || props.selected || props.onPress ? (
      <View style={styles.rowAccessory}>
        {props.detail ? <Text style={[styles.rowAccessoryText, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
        {props.selected ? <Text style={[styles.rowCheckmark, { color: theme.colors.primary }]}>✓</Text> : props.onPress ? <Text style={[styles.rowChevron, { color: theme.colors.mutedText }]}>›</Text> : null}
      </View>
    ) : undefined

  return (
    <AppListRow
      hideDivider={props.hideDivider}
      left={props.icon ? <AppGlyph name={props.icon} /> : undefined}
      onPress={props.onPress}
      right={accessory}
      title={props.label}
    />
  )
}

export function PrimaryButton(props: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  return <AppButton disabled={props.disabled} label={props.label} loading={props.loading} onPress={props.onPress} />
}

export function useProfileRefresh() {
  const mergeRemoteProfile = useUserStore(state => state.mergeRemoteProfile)

  return async () => {
    const profile = await getCurrentUserProfile()
    mergeRemoteProfile(profile)
    return profile
  }
}

export const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: "#6E6E73",
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  textarea: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 13,
    color: "#6E6E73",
    lineHeight: 20,
  },
  centerMuted: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6E6E73",
  },
  emailValue: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#111111",
  },
  inlineTextButton: {
    alignSelf: "flex-end",
  },
  inlineTextButtonLabel: {
    color: "#0A84FF",
    fontWeight: "600",
  },
  headerLink: {
    color: "#0A84FF",
    fontWeight: "600",
    fontSize: 14,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#3A3A3C",
    flex: 1,
  },
  diffRow: {
    flexDirection: "row",
    gap: 8,
  },
  diffCellLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
  diffCell: {
    flex: 1,
    fontSize: 13,
    color: "#3A3A3C",
  },
  brandTitle: {
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: "#111111",
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  levelChip: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(60,60,67,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipActive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  levelChipText: {
    color: "#111111",
    fontWeight: "600",
  },
  levelChipTextActive: {
    color: "#FFFFFF",
  },
  qrImage: {
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60,60,67,0.18)",
  },
  tableHeadCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#6E6E73",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60,60,67,0.12)",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#111111",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 18,
    lineHeight: 22,
    color: "#0A84FF",
  },
  sectionHeader: {
    gap: 3,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionHeaderDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowAccessoryText: {
    fontSize: 13,
  },
  rowChevron: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "300",
  },
  rowCheckmark: {
    fontSize: 16,
    fontWeight: "700",
  },
})

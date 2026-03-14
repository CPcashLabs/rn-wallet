import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { SettingsStackParamList } from "@/app/navigation/types"
import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import type { ExchangeRateItem } from "@/features/settings/services/settingsApi"
import type { GuideSection } from "@/features/settings/utils/settingsHub"
import { useUserStore } from "@/shared/store/useUserStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"

export type StackProps<T extends keyof SettingsStackParamList> = NativeStackScreenProps<SettingsStackParamList, T>

export type GuideScreenName =
  | "WalletGuideDetailScreen"
  | "FAQGuideDetailScreen"
  | "KnowledgeGuideDetailScreen"
  | "SafetyGuideDetailScreen"

export type GuideListScreenProps = NativeStackScreenProps<SettingsStackParamList, GuideScreenName> & {
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
  const theme = useAppTheme()
  return <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{props.children}</View>
}

export function Row(props: { label: string; detail?: string; onPress?: () => void; children?: React.ReactNode }) {
  const theme = useAppTheme()

  return (
    <Pressable disabled={!props.onPress} onPress={props.onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{props.label}</Text>
        {props.detail ? <Text style={[styles.rowDetail, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
      </View>
      {props.children ?? (props.onPress ? <Text style={[styles.rowArrow, { color: theme.colors.mutedText }]}>›</Text> : null)}
    </Pressable>
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDetail: {
    fontSize: 12,
  },
  rowArrow: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
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
    color: "#DC2626",
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  centerMuted: {
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
  },
  emailValue: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  inlineTextButton: {
    alignSelf: "flex-end",
  },
  inlineTextButtonLabel: {
    color: "#0F766E",
    fontWeight: "700",
  },
  headerLink: {
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 14,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
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
    color: "#0F172A",
  },
  diffCell: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
  },
  brandTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
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
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  levelChipText: {
    color: "#0F172A",
    fontWeight: "700",
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
    borderBottomColor: "#CBD5E1",
  },
  tableHeadCell: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    color: "#0F172A",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 18,
    lineHeight: 22,
    color: "#0F766E",
  },
})

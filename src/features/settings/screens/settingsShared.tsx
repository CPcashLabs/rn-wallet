import React from "react"

import { StyleSheet, Text, View } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { HelpStackParamList, SettingsStackParamList } from "@/app/navigation/types"
import { getCurrentUserProfile } from "@/features/home/services/homeApi"
import type { ExchangeRateItem } from "@/features/settings/services/settingsApi"
import { useUserStore } from "@/shared/store/useUserStore"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard } from "@/shared/ui/AppCard"
import { AppButton } from "@/shared/ui/AppButton"
import { AppGlyph, type AppGlyphName } from "@/shared/ui/AppGlyph"
import { AppListCard, AppListRow } from "@/shared/ui/AppList"
import { SFSymbolIcon } from "@/shared/ui/SFSymbolIcon"

export type StackProps<T extends keyof SettingsStackParamList> = NativeStackScreenProps<SettingsStackParamList, T>
export type HelpStackProps<T extends keyof HelpStackParamList> = NativeStackScreenProps<HelpStackParamList, T>

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
    <View style={staticStyles.sectionHeader}>
      <Text style={[staticStyles.sectionHeaderTitle, { color: theme.colors.mutedText }]}>{props.title}</Text>
      {props.detail ? <Text style={[staticStyles.sectionHeaderDetail, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
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
      <View style={staticStyles.rowAccessory}>
        {props.detail ? <Text style={[staticStyles.rowAccessoryText, { color: theme.colors.mutedText }]}>{props.detail}</Text> : null}
        {props.selected ? (
          <SFSymbolIcon color={theme.colors.primary} fallbackName="check" name="checkmark" size={15} weight="semibold" />
        ) : props.onPress ? (
          <SFSymbolIcon color={theme.colors.mutedText} fallbackName="chevron-right" name="chevron.right" size={13} weight="semibold" />
        ) : null}
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

// Theme-aware styles hook. Use inside any component that renders settings UI.
// Replaces the old static `styles` export which had hardcoded light-only colors.
export function useStyles() {
  const theme = useAppTheme()

  return {
    sectionLabel: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600" as const,
      color: theme.colors.mutedText,
    },
    input: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
    },
    textarea: {
      minHeight: 140,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 14,
      textAlignVertical: "top" as const,
      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
      color: theme.colors.text,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.danger,
    },
    helperText: {
      fontSize: 13,
      color: theme.colors.mutedText,
      lineHeight: 20,
    },
    centerMuted: {
      textAlign: "center" as const,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.mutedText,
    },
    emailValue: {
      textAlign: "center" as const,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "700" as const,
      letterSpacing: -0.2,
      color: theme.colors.text,
    },
    inlineTextButton: {
      alignSelf: "flex-end" as const,
    },
    inlineTextButtonLabel: {
      color: theme.colors.primary,
      fontWeight: "600" as const,
    },
    headerLink: {
      color: theme.colors.primary,
      fontWeight: "600" as const,
      fontSize: 14,
    },
    questionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: theme.colors.text,
    },
    answerText: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.mutedText,
      flex: 1,
    },
    diffRow: {
      flexDirection: "row" as const,
      gap: 8,
    },
    diffCellLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: theme.colors.text,
    },
    diffCell: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.mutedText,
    },
    brandTitle: {
      textAlign: "center" as const,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "700" as const,
      letterSpacing: -0.4,
      color: theme.colors.text,
    },
    levelRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      justifyContent: "center" as const,
    },
    levelChip: {
      minWidth: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    levelChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    levelChipText: {
      color: theme.colors.text,
      fontWeight: "600" as const,
    },
    levelChipTextActive: {
      color: theme.colors.brandInverse,
    },
    qrImage: {
      alignSelf: "center" as const,
      width: 180,
      height: 180,
      borderRadius: 12,
    },
    tableHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tableHeadCell: {
      flex: 1,
      textAlign: "center" as const,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600" as const,
      color: theme.colors.mutedText,
    },
    tableRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tableCell: {
      flex: 1,
      textAlign: "center" as const,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    bulletRow: {
      flexDirection: "row" as const,
      gap: 8,
      alignItems: "flex-start" as const,
    },
    bulletDot: {
      fontSize: 18,
      lineHeight: 22,
      color: theme.colors.primary,
    },
  }
}

const staticStyles = StyleSheet.create({
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
})

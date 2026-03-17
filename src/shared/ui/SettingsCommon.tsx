import React from "react"

import { StyleSheet } from "react-native"

import { AppButton } from "@/shared/ui/AppButton"
import { AppCard } from "@/shared/ui/AppCard"

export function SettingsCard(props: { children: React.ReactNode }) {
  return <AppCard>{props.children}</AppCard>
}

export function SettingsPrimaryButton(props: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  return <AppButton disabled={props.disabled} label={props.label} loading={props.loading} onPress={props.onPress} />
}

export const settingsCommonStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6E6E73",
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
})

export const Card = SettingsCard
export const PrimaryButton = SettingsPrimaryButton
export const styles = settingsCommonStyles

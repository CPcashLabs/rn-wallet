import React from "react"

import { StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native"

import { AppButton } from "@/shared/ui/AppButton"
import { useAppTheme } from "@/shared/theme/useAppTheme"

export function SectionCard(props: { children: React.ReactNode }) {
  const theme = useAppTheme()

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {props.children}
    </View>
  )
}

export function FieldRow(props: { label: string; value: string; emphasized?: boolean }) {
  const theme = useAppTheme()

  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: theme.colors.mutedText }]}>{props.label}</Text>
      <Text style={[styles.fieldValue, props.emphasized ? styles.fieldStrong : null, { color: theme.colors.text }]}>
        {props.value}
      </Text>
    </View>
  )
}

export function PrimaryButton(props: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return <AppButton disabled={props.disabled} label={props.label} loading={props.loading} onPress={props.onPress} style={[styles.buttonBlock, props.style]} />
}

export function SecondaryButton(props: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  tone?: "default" | "danger"
  style?: StyleProp<ViewStyle>
}) {
  return (
    <AppButton
      disabled={props.disabled}
      label={props.label}
      loading={props.loading}
      onPress={props.onPress}
      style={[styles.buttonBlock, props.style]}
      tone={props.tone}
      variant="secondary"
    />
  )
}

export function PageEmpty(props: { title: string; body: string }) {
  const theme = useAppTheme()

  return (
    <SectionCard>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{props.title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.mutedText }]}>{props.body}</Text>
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  fieldLabel: {
    fontSize: 13,
  },
  fieldValue: {
    fontSize: 14,
    textAlign: "right",
    flex: 1,
  },
  fieldStrong: {
    fontWeight: "700",
  },
  buttonBlock: {
    width: "100%",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
  },
})

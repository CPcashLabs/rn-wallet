import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"

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

export function PrimaryButton(props: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useAppTheme()

  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.primaryButton,
        {
          backgroundColor: theme.colors.primary,
          opacity: props.disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={styles.primaryButtonText}>{props.label}</Text>
    </Pressable>
  )
}

export function SecondaryButton(props: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useAppTheme()

  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.secondaryButton,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: props.disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{props.label}</Text>
    </Pressable>
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
  primaryButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
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

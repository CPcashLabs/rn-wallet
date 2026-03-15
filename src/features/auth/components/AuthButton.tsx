import React from "react"

import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function AuthButton(props: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary"
  disabled?: boolean
  loading?: boolean
}) {
  const theme = useAppTheme()
  const isPrimary = props.variant !== "secondary"

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.colors.primary : theme.colors.surfaceElevated ?? theme.colors.surface,
          borderColor: isPrimary ? theme.colors.primary : theme.colors.border,
          opacity: props.disabled || props.loading ? 0.45 : pressed ? 0.82 : 1,
          shadowColor: theme.colors.shadow,
          shadowOpacity: isPrimary ? (theme.isDark ? 0.2 : 0.14) : 0.04,
          shadowRadius: isPrimary ? 16 : 10,
          shadowOffset: { width: 0, height: isPrimary ? 10 : 6 },
          elevation: isPrimary ? 4 : 1,
        },
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={isPrimary ? "#FFFFFF" : theme.colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: isPrimary ? "#FFFFFF" : theme.colors.text,
            },
          ]}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
})

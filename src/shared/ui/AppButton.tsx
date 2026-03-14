import React from "react"

import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type AppButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "primary" | "secondary"
  tone?: "default" | "danger"
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function AppButton(props: AppButtonProps) {
  const theme = useAppTheme()
  const variant = props.variant ?? "primary"
  const tone = props.tone ?? "default"
  const disabled = Boolean(props.disabled || props.loading)
  const primaryColor = tone === "danger" ? "#DC2626" : theme.colors.primary
  const secondaryTextColor = tone === "danger" ? "#DC2626" : theme.colors.text
  const secondaryBorderColor = tone === "danger" ? "#FECACA" : theme.colors.border

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={[
        styles.base,
        variant === "primary"
          ? {
              backgroundColor: primaryColor,
            }
          : {
              backgroundColor: theme.colors.surface,
              borderColor: secondaryBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
            },
        disabled ? styles.disabled : null,
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : primaryColor} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" ? styles.labelPrimary : null,
            { color: variant === "primary" ? "#FFFFFF" : secondaryTextColor },
            props.textStyle,
          ]}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  labelPrimary: {
    letterSpacing: 0.2,
  },
})

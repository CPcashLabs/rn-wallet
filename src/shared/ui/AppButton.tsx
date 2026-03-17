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

export const AppButton = React.memo(function AppButton(props: AppButtonProps) {
  const theme = useAppTheme()
  const variant = props.variant ?? "primary"
  const tone = props.tone ?? "default"
  const disabled = Boolean(props.disabled || props.loading)
  const primaryColor = tone === "danger" ? theme.colors.danger : theme.colors.primary
  const primaryBorderColor = tone === "danger" ? "rgba(255,255,255,0.14)" : theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.56)"
  const secondaryTextColor = tone === "danger" ? theme.colors.danger : theme.colors.text
  const secondaryBorderColor = tone === "danger" ? theme.colors.dangerBorder : theme.colors.glassBorder
  const secondaryBackgroundColor =
    tone === "danger"
      ? theme.isDark
        ? "rgba(248,113,113,0.12)"
        : "rgba(220,38,38,0.08)"
      : theme.colors.glass

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary"
          ? {
              backgroundColor: primaryColor,
              borderColor: primaryBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.isDark ? 0.22 : 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 4,
            }
          : {
              backgroundColor: secondaryBackgroundColor,
              borderColor: secondaryBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.isDark ? 0.12 : 0.05,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 2,
            },
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : primaryColor} />
      ) : (
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
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
})

AppButton.displayName = "AppButton"

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  labelPrimary: {
    letterSpacing: -0.3,
  },
})

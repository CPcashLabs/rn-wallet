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
  const primaryBorderColor = primaryColor
  const secondaryTextColor = tone === "danger" ? theme.colors.danger : theme.colors.text
  const secondaryBorderColor = tone === "danger" ? theme.colors.dangerBorder : theme.colors.border
  const secondaryBackgroundColor =
    tone === "danger"
      ? theme.isDark
        ? "rgba(248,113,113,0.12)"
        : "rgba(220,38,38,0.08)"
      : theme.colors.surfaceElevated ?? theme.colors.surface

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
              shadowOpacity: theme.isDark ? 0.14 : 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }
          : {
              backgroundColor: secondaryBackgroundColor,
              borderColor: secondaryBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.isDark ? 0.06 : 0.02,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
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
    minHeight: 52,
    borderRadius: 16,
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
    fontWeight: "600",
  },
  labelPrimary: {
    letterSpacing: -0.41,
  },
})

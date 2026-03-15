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
  const secondaryTextColor = tone === "danger" ? theme.colors.danger : theme.colors.text
  const secondaryBorderColor = tone === "danger" ? theme.colors.dangerBorder : theme.colors.border

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary"
          ? {
              backgroundColor: primaryColor,
              shadowColor: theme.colors.shadow,
              shadowOpacity: theme.isDark ? 0.16 : 0.14,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 3,
            }
          : {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: secondaryBorderColor,
              borderWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  labelPrimary: {
    letterSpacing: 0.2,
  },
})

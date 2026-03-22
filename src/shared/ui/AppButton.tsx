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
  const metrics = theme.components.button
  const primaryColor = tone === "danger" ? theme.colors.danger : theme.colors.primary
  const primaryBorderColor = primaryColor
  const secondaryTextColor = tone === "danger" ? theme.colors.danger : theme.colors.text
  const secondaryBorderColor = tone === "danger" ? theme.colors.dangerBorder : theme.colors.border
  const secondaryBackgroundColor = tone === "danger" ? theme.colors.dangerSoft : theme.colors.surfaceElevated ?? theme.colors.surface

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: metrics.minHeight,
          borderRadius: metrics.radius,
          paddingHorizontal: metrics.paddingX,
        },
        variant === "primary"
          ? {
              backgroundColor: primaryColor,
              borderColor: primaryBorderColor,
              borderWidth: metrics.borderWidth,
              ...theme.shadows.emphasized,
            }
          : {
              backgroundColor: secondaryBackgroundColor,
              borderColor: secondaryBorderColor,
              borderWidth: metrics.borderWidth,
              ...theme.shadows.control,
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
            theme.typography.button,
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
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  label: {
    textAlign: "center",
  },
})

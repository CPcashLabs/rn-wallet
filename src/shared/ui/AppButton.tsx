import React from "react"

import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

import { useAppTheme } from "@/shared/theme/useAppTheme"

const SPRING_PRESS = { damping: 16, stiffness: 300, mass: 1 } as const
const SPRING_RELEASE = { damping: 13, stiffness: 200, mass: 1 } as const

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
  const primaryTextColor = theme.colors.brandInverse

  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING_PRESS)
  }
  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_RELEASE)
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={props.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
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
          props.style,
        ]}
      >
        {props.loading ? (
          <ActivityIndicator color={variant === "primary" ? primaryTextColor : primaryColor} />
        ) : (
          <Text
            style={[
              styles.label,
              theme.typography.button,
              { color: variant === "primary" ? primaryTextColor : secondaryTextColor },
              props.textStyle,
            ]}
          >
            {props.label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
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
  label: {
    textAlign: "center",
  },
})

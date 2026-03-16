import React, { useEffect } from "react"

import { StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function SecureEntropyLoader(props: {
  title: string
  body: string
  hint?: string
}) {
  const theme = useAppTheme()
  const primaryColor = theme.colors.primary
  const primarySoftColor = theme.colors.primarySoft ?? `${theme.colors.primary}22`
  const surfaceColor = theme.colors.surfaceMuted ?? theme.colors.surface
  const borderColor = theme.colors.border
  const textColor = theme.colors.text
  const mutedTextColor = theme.colors.mutedText
  const pulse = useSharedValue(0)
  const rotation = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    )
    rotation.value = withRepeat(
      withTiming(360, { duration: 3600, easing: Easing.linear }),
      -1,
      false,
    )

    return () => {
      cancelAnimation(pulse)
      cancelAnimation(rotation)
    }
  }, [pulse, rotation])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.24, 0.52]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.18]) }],
  }))

  const outerRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0.18]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.88, 1.18]) }],
  }))

  const innerRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.32, 0.6]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.94, 1.04]) }],
  }))

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.96, 1.08]) }],
  }))

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.visualArea}>
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: primarySoftColor,
            },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.outerRing,
            {
              borderColor: primaryColor,
            },
            outerRingStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.innerRing,
            {
              borderColor: primaryColor,
            },
            innerRingStyle,
          ]}
        />
        <Animated.View style={[styles.orbit, orbitStyle]}>
          <View style={[styles.orbitDot, styles.orbitDotTop, { backgroundColor: primaryColor }]} />
          <View style={[styles.orbitDot, styles.orbitDotBottom, { backgroundColor: primaryColor }]} />
        </Animated.View>
        <Animated.View style={[styles.core, { backgroundColor: primaryColor }, coreStyle]} />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: textColor }]}>{props.title}</Text>
        <Text style={[styles.body, { color: mutedTextColor }]}>{props.body}</Text>
        {props.hint ? (
          <Text style={[styles.hint, { color: primaryColor }]}>{props.hint}</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  visualArea: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
  },
  glow: {
    width: 72,
    height: 72,
    borderRadius: 999,
    position: "absolute",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  outerRing: {
    width: 88,
    height: 88,
  },
  innerRing: {
    width: 58,
    height: 58,
  },
  orbit: {
    width: 78,
    height: 78,
    position: "absolute",
  },
  orbitDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    position: "absolute",
    opacity: 0.92,
  },
  orbitDotTop: {
    top: 4,
    left: 35,
  },
  orbitDotBottom: {
    bottom: 6,
    left: 35,
  },
  core: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
})

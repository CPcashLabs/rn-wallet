import React from "react"

import { StyleSheet, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type AppleBrandMarkProps = {
  size?: number
  tone?: "auto" | "light" | "dark"
}

export function AppleBrandMark({ size = 60, tone = "auto" }: AppleBrandMarkProps) {
  const theme = useAppTheme()
  const resolvedTone = tone === "auto" ? (theme.isDark ? "dark" : "light") : tone
  const shellBackgroundColor = resolvedTone === "light" ? "rgba(255,255,255,0.88)" : "rgba(28,28,30,0.92)"
  const shellBorderColor = resolvedTone === "light" ? "rgba(17,17,17,0.08)" : "rgba(255,255,255,0.08)"
  const glyphColor = resolvedTone === "light" ? "#111111" : "#FFFFFF"
  const sheenColor = resolvedTone === "light" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.08)"
  const scale = size / 64

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: shellBackgroundColor,
          borderColor: shellBorderColor,
          shadowColor: theme.colors.shadow,
          shadowOpacity: theme.isDark ? 0.24 : 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        },
      ]}
    >
      <View
        style={[
          styles.sheen,
          {
            backgroundColor: sheenColor,
            width: size * 0.64,
            height: size * 0.28,
            borderRadius: size * 0.2,
            top: size * 0.12,
          },
        ]}
      />
      <View style={[styles.logoFrame, { transform: [{ scale }] }]}>
        <View style={[styles.bodyLeft, { backgroundColor: glyphColor }]} />
        <View style={[styles.bodyRight, { backgroundColor: glyphColor }]} />
        <View style={[styles.bodyBottom, { backgroundColor: glyphColor }]} />
        <View style={[styles.stem, { backgroundColor: glyphColor }]} />
        <View style={[styles.leaf, { backgroundColor: glyphColor }]} />
        <View style={[styles.bite, { backgroundColor: shellBackgroundColor }]} />
        <View style={[styles.topCut, { backgroundColor: shellBackgroundColor }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    alignSelf: "center",
  },
  logoFrame: {
    width: 64,
    height: 64,
  },
  bodyLeft: {
    position: "absolute",
    left: 15,
    top: 18,
    width: 20,
    height: 25,
    borderRadius: 12,
  },
  bodyRight: {
    position: "absolute",
    left: 29,
    top: 18,
    width: 20,
    height: 25,
    borderRadius: 12,
  },
  bodyBottom: {
    position: "absolute",
    left: 17,
    top: 29,
    width: 30,
    height: 22,
    borderRadius: 14,
  },
  stem: {
    position: "absolute",
    left: 31,
    top: 12,
    width: 4,
    height: 8,
    borderRadius: 4,
    transform: [{ rotate: "-22deg" }],
  },
  leaf: {
    position: "absolute",
    left: 35,
    top: 9,
    width: 12,
    height: 8,
    borderRadius: 8,
    transform: [{ rotate: "-36deg" }],
  },
  bite: {
    position: "absolute",
    left: 42,
    top: 25,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  topCut: {
    position: "absolute",
    left: 26,
    top: 14,
    width: 10,
    height: 8,
    borderRadius: 5,
  },
})

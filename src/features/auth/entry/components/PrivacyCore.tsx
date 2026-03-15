import React from "react"

import { Animated, StyleSheet, View } from "react-native"

import {
  ENTRY_CORE_PRIMARY,
  ENTRY_CORE_RING,
  ENTRY_CORE_SECONDARY,
  ENTRY_IDLE_BREATH_DURATION_MS,
  ENTRY_WAVE_DURATION_MS,
} from "@/features/auth/entry/constants"

type Props = {
  size: number
  timeMs: number
  activatedAt: number | null
  coreScale: Animated.Value
}

export function PrivacyCore({ size, timeMs, activatedAt, coreScale }: Props) {
  const phase = (timeMs % ENTRY_IDLE_BREATH_DURATION_MS) / ENTRY_IDLE_BREATH_DURATION_MS
  const breath = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2)
  const breathingRadius = size * (0.14 + breath * 0.012)
  const glowRadius = size * (0.32 + breath * 0.024)
  const waveProgress = activatedAt === null ? 0 : Math.min((timeMs - activatedAt) / ENTRY_WAVE_DURATION_MS, 1)
  const waveRadius = activatedAt === null ? 0 : size * (0.18 + waveProgress * 0.52)
  const waveOpacity = activatedAt === null ? 0 : (1 - waveProgress) * 0.26

  return (
    <Animated.View style={[styles.shell, { width: size, height: size, transform: [{ scale: coreScale }] }]}>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: glowRadius * 2,
            height: glowRadius * 2,
            borderRadius: glowRadius,
          },
        ]}
      />
      {activatedAt !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.wave,
            {
              width: waveRadius * 2,
              height: waveRadius * 2,
              borderRadius: waveRadius,
              opacity: waveOpacity,
            },
          ]}
        />
      ) : null}
      <View style={[styles.corePlate, { width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22 }]} />
      <View style={[styles.coreWell, { width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19 }]} />
      <View style={[styles.coreRing, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]} />
      <View
        style={[
          styles.corePulse,
          {
            width: breathingRadius * 2,
            height: breathingRadius * 2,
            borderRadius: breathingRadius,
          },
        ]}
      />
      <View style={[styles.coreDot, { width: size * 0.084, height: size * 0.084, borderRadius: size * 0.042 }]} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(110,122,255,0.16)",
    shadowColor: ENTRY_CORE_PRIMARY,
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  wave: {
    position: "absolute",
    borderColor: "rgba(168,182,255,0.28)",
    borderWidth: 2.4,
  },
  corePlate: {
    position: "absolute",
    backgroundColor: "rgba(8,10,18,0.92)",
  },
  coreWell: {
    position: "absolute",
    backgroundColor: "rgba(14,17,31,0.96)",
    shadowColor: ENTRY_CORE_SECONDARY,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  coreRing: {
    position: "absolute",
    backgroundColor: ENTRY_CORE_RING,
  },
  corePulse: {
    position: "absolute",
    backgroundColor: ENTRY_CORE_PRIMARY,
    opacity: 0.9,
    shadowColor: ENTRY_CORE_SECONDARY,
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  coreDot: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
})

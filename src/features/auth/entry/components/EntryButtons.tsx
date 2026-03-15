import React from "react"

import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  ENTRY_BUTTON_BACKGROUND,
  ENTRY_BUTTON_BORDER,
  ENTRY_BUTTON_GLOW,
  ENTRY_BUTTON_HEIGHT,
  ENTRY_BUTTON_MAX_WIDTH,
} from "@/features/auth/entry/constants"
import type { EntryOption } from "@/features/auth/entry/types"

type Props = {
  options: EntryOption[]
  revealProgress: Animated.Value
  interactive: boolean
}

type EntryButtonItemProps = {
  option: EntryOption
  revealProgress: Animated.Value
  index: number
  interactive: boolean
}

export function EntryButtons({ options, revealProgress, interactive }: Props) {
  return (
    <View style={styles.container} pointerEvents={interactive ? "auto" : "none"}>
      {options.map((option, index) => (
        <EntryButtonItem
          key={option.key}
          index={index}
          interactive={interactive}
          option={option}
          revealProgress={revealProgress}
        />
      ))}
    </View>
  )
}

function EntryButtonItem({ option, revealProgress, index, interactive }: EntryButtonItemProps) {
  const { t } = useTranslation()
  const localProgress = revealProgress.interpolate({
    inputRange: [index * 0.16, Math.min(index * 0.16 + 0.84, 1)],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  return (
    <Animated.View
      style={[
        styles.optionShell,
        {
          opacity: localProgress,
          transform: [
            {
              translateY: localProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-26, 0],
              }),
            },
            {
              scale: localProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.72, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        disabled={!interactive}
        onPress={option.onPress}
        style={({ pressed }) => [
          styles.optionButton,
          {
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <Text style={styles.label}>{t(option.labelKey)}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  optionShell: {
    width: ENTRY_BUTTON_MAX_WIDTH,
  },
  optionButton: {
    backgroundColor: ENTRY_BUTTON_BACKGROUND,
    borderColor: ENTRY_BUTTON_BORDER,
    borderRadius: 22,
    borderWidth: 1,
    height: ENTRY_BUTTON_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: ENTRY_BUTTON_GLOW,
    shadowOpacity: 0.46,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
})

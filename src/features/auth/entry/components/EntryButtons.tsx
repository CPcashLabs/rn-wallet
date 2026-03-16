import React from "react"

import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  ENTRY_BUTTON_BACKGROUND,
  ENTRY_BUTTON_BACKGROUND_ACTIVE,
  ENTRY_BUTTON_BORDER,
  ENTRY_BUTTON_BORDER_ACTIVE,
  ENTRY_BUTTON_GLOW,
  ENTRY_BUTTON_HEIGHT,
  ENTRY_BUTTON_MAX_WIDTH,
  ENTRY_TEXT_MUTED,
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
  const headingOpacity = revealProgress.interpolate({
    inputRange: [0, 0.32, 1],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  })

  return (
    <View style={styles.container} pointerEvents={interactive ? "auto" : "none"}>
      <Animated.View
        style={[
          styles.headingBlock,
          {
            opacity: headingOpacity,
            transform: [
              {
                translateY: headingOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.headingEyebrow}>ENTRY OPTIONS</Text>
      </Animated.View>
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
            backgroundColor: pressed ? ENTRY_BUTTON_BACKGROUND_ACTIVE : ENTRY_BUTTON_BACKGROUND,
            borderColor: pressed ? ENTRY_BUTTON_BORDER_ACTIVE : ENTRY_BUTTON_BORDER,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <View style={styles.buttonRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>{`0${index + 1}`}</Text>
          </View>
          <View style={styles.copyBlock}>
            <Text style={styles.label}>{t(option.labelKey)}</Text>
            <Text style={styles.description}>{t(option.descriptionKey)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  headingBlock: {
    alignItems: "center",
    marginBottom: 4,
  },
  headingEyebrow: {
    color: ENTRY_TEXT_MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  optionShell: {
    width: ENTRY_BUTTON_MAX_WIDTH,
  },
  optionButton: {
    borderRadius: 26,
    borderWidth: 1,
    height: ENTRY_BUTTON_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: ENTRY_BUTTON_GLOW,
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  stepBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 40,
  },
  stepText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  copyBlock: {
    flex: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  description: {
    color: ENTRY_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 3,
  },
  chevron: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 24,
    fontWeight: "400",
    marginTop: -2,
  },
})

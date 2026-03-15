import React from "react"

import { Animated, StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"

import { ENTRY_TEXT_MAX_WIDTH, ENTRY_TEXT_PRIMARY, ENTRY_TEXT_SECONDARY } from "@/features/auth/entry/constants"

type Props = {
  line1Progress: Animated.Value
  line2Progress: Animated.Value
}

const AnimatedText = Animated.createAnimatedComponent(Text)

export function EntryStatement({ line1Progress, line2Progress }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <AnimatedText
        style={[
          styles.line,
          styles.lineSecondary,
          {
            opacity: line1Progress,
            transform: [
              {
                translateY: line1Progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        {t("auth.entry.statementVisible")}
      </AnimatedText>
      <AnimatedText
        style={[
          styles.line,
          styles.linePrimary,
          {
            opacity: line2Progress,
            transform: [
              {
                translateY: line2Progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        {t("auth.entry.statementPrivate")}
      </AnimatedText>
    </>
  )
}

const styles = StyleSheet.create({
  line: {
    width: ENTRY_TEXT_MAX_WIDTH,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  linePrimary: {
    color: ENTRY_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
    marginTop: 10,
  },
  lineSecondary: {
    color: ENTRY_TEXT_SECONDARY,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
  },
})

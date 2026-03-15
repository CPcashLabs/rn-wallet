import React, { useEffect, useRef } from "react"

import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppCard } from "@/shared/ui/AppCard"

type Props = {
  visible: boolean
}

export function TransferOrderCreatingOverlay({ visible }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const spinValue = useRef(new Animated.Value(0)).current
  const pulseValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      spinValue.stopAnimation()
      pulseValue.stopAnimation()
      return
    }

    spinValue.setValue(0)
    pulseValue.setValue(0)

    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 780,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 780,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    )

    spinLoop.start()
    pulseLoop.start()

    return () => {
      spinLoop.stop()
      pulseLoop.stop()
    }
  }, [pulseValue, spinValue, visible])

  if (!visible) {
    return null
  }

  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const haloScale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  })

  const haloOpacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.36],
  })

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible>
      <View style={styles.backdrop}>
        <AppCard style={styles.card}>
          <View style={styles.animationWrap}>
            <Animated.View
              style={[
                styles.halo,
                {
                  backgroundColor: theme.colors.primarySoft ?? "rgba(10,132,255,0.16)",
                  opacity: haloOpacity,
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: theme.colors.primary,
                  borderTopColor: "transparent",
                  transform: [{ rotate: rotation }],
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            </Animated.View>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t("transfer.order.creatingTitle")}</Text>
          <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("transfer.order.creatingBody")}</Text>
        </AppCard>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 14,
    paddingVertical: 28,
  },
  animationWrap: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  ring: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
})

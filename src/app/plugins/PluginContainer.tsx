import React, { useEffect, useRef } from "react"

import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { PLUGIN_TRANSITION_SPEC } from "@/app/plugins/pluginPresentationSpec"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import type { PluginPresentation } from "@/shared/plugins/types"

type Props = {
  children?: React.ReactNode
  closing: boolean
  error: Error | null
  loading: boolean
  pluginName: string
  presentation: PluginPresentation
  onClosed: () => void
  onRequestClose: () => void
}

export function PluginContainer({
  children,
  closing,
  error,
  loading,
  pluginName,
  presentation,
  onClosed,
  onRequestClose,
}: Props) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const translateY = useRef(new Animated.Value(0)).current
  const translateX = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const hasAnimatedInRef = useRef(false)
  const hasAnimatedOutRef = useRef(false)

  useEffect(() => {
    if (hasAnimatedInRef.current) {
      return
    }

    hasAnimatedInRef.current = true
    translateY.setValue(0)
    translateX.setValue(width)
    overlayOpacity.setValue(0)

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: PLUGIN_TRANSITION_SPEC.enterDurationMs,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: PLUGIN_TRANSITION_SPEC.overlayEnterDurationMs,
        useNativeDriver: true,
      }),
    ]).start()
  }, [overlayOpacity, translateX, translateY, width])

  useEffect(() => {
    if (!closing || hasAnimatedOutRef.current) {
      return
    }

    hasAnimatedOutRef.current = true

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: width,
        duration: PLUGIN_TRANSITION_SPEC.exitDurationMs,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: PLUGIN_TRANSITION_SPEC.overlayExitDurationMs,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClosed()
      }
    })
  }, [closing, onClosed, overlayOpacity, translateX, width])

  const closeButtonBackgroundColor = theme.isDark ? "rgba(15,23,42,0.88)" : "rgba(255,255,255,0.92)"
  const closeButtonBorderColor = theme.isDark ? "rgba(148,163,184,0.28)" : "rgba(15,23,42,0.1)"

  return (
    <View style={[styles.root, { backgroundColor: "transparent" }]}>
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity, backgroundColor: "rgba(2,6,23,0.18)" }]} />
      <Animated.View
        style={[
          styles.surface,
          presentation.style === "sheet" ? styles.sheetSurface : styles.fullscreenSurface,
          {
            backgroundColor: theme.colors.background,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <View pointerEvents="box-none" style={styles.closeLayer}>
          <Pressable
            accessibilityRole="button"
            disabled={closing}
            hitSlop={10}
            onPress={onRequestClose}
            style={[
              styles.closeButton,
              {
                marginTop: insets.top + 10,
                backgroundColor: closeButtonBackgroundColor,
                borderColor: closeButtonBorderColor,
              },
            ]}
          >
            <Text style={[styles.closeText, { color: theme.colors.text }]}>{t("common.close")}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={[styles.viewport, { paddingTop: insets.top }]}>
            <View style={styles.stateContainer}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{pluginName}</Text>
              <Text style={[styles.stateBody, { color: theme.colors.mutedText }]}>{t("common.loading")}</Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.viewport, { paddingTop: insets.top }]}>
            <View style={styles.stateContainer}>
              <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{t("common.errorTitle")}</Text>
              <Text style={[styles.stateBody, { color: theme.colors.mutedText }]} numberOfLines={3}>
                {error.message}
              </Text>
            </View>
          </View>
        ) : null}

        {!loading && !error ? (
          <View style={[styles.content, { paddingTop: insets.top }]}>
            {children}
          </View>
        ) : null}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  surface: {
    flex: 1,
    overflow: "hidden",
  },
  sheetSurface: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  fullscreenSurface: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  closeLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingRight: 16,
  },
  closeButton: {
    minWidth: 66,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  closeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  stateBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  viewport: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})

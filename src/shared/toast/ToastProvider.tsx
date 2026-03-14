import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ToastContext, type ToastInput, type ToastTone } from "@/shared/toast/ToastContext"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type ToastItem = {
  duration: number
  id: number
  message: string
  tone: ToastTone
}

const DEFAULT_DURATION = 2200
const ENTER_DURATION = 220
const EXIT_DURATION = 180
const INITIAL_OFFSET = 16

function normalizeToast(input: ToastInput, id: number): ToastItem {
  if (typeof input === "string") {
    return {
      duration: DEFAULT_DURATION,
      id,
      message: input,
      tone: "default",
    }
  }

  return {
    duration: input.duration ?? DEFAULT_DURATION,
    id,
    message: input.message,
    tone: input.tone ?? "default",
  }
}

function resolveToastColors(tone: ToastTone) {
  switch (tone) {
    case "success":
      return { backgroundColor: "#0F766E", borderColor: "#14B8A6" }
    case "warning":
      return { backgroundColor: "#92400E", borderColor: "#F59E0B" }
    case "error":
      return { backgroundColor: "#991B1B", borderColor: "#F87171" }
    default:
      return { backgroundColor: "#111827", borderColor: "#334155" }
  }
}

export function ToastProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const nextIdRef = useRef(0)
  const queueRef = useRef<ToastItem[]>([])
  const currentRef = useRef<ToastItem | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(INITIAL_OFFSET)).current
  const [current, setCurrent] = useState<ToastItem | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const stopAnimation = useCallback(() => {
    animationRef.current?.stop()
    animationRef.current = null
  }, [])

  const hideToast = useCallback(() => {
    clearHideTimer()
    stopAnimation()

    animationRef.current = Animated.parallel([
      Animated.timing(opacity, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),
        toValue: INITIAL_OFFSET,
        useNativeDriver: true,
      }),
    ])

    animationRef.current.start(({ finished }) => {
      animationRef.current = null
      if (!finished) {
        return
      }

      currentRef.current = null
      setCurrent(null)
    })
  }, [clearHideTimer, opacity, stopAnimation, translateY])

  const showToast = useCallback((input: ToastInput) => {
    nextIdRef.current += 1
    const item = normalizeToast(input, nextIdRef.current)

    if (!item.message.trim()) {
      return
    }

    if (currentRef.current) {
      queueRef.current.push(item)
      return
    }

    currentRef.current = item
    setCurrent(item)
  }, [])

  useEffect(() => {
    if (!current) {
      opacity.setValue(0)
      translateY.setValue(INITIAL_OFFSET)

      const next = queueRef.current.shift()
      if (next) {
        currentRef.current = next
        setCurrent(next)
      }

      return
    }

    clearHideTimer()
    stopAnimation()
    opacity.setValue(0)
    translateY.setValue(INITIAL_OFFSET)

    animationRef.current = Animated.parallel([
      Animated.timing(opacity, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ])

    animationRef.current.start(({ finished }) => {
      animationRef.current = null
      if (!finished) {
        return
      }

      hideTimerRef.current = setTimeout(() => {
        hideToast()
      }, current.duration)
    })
  }, [clearHideTimer, current, hideToast, opacity, stopAnimation, translateY])

  useEffect(() => {
    return () => {
      clearHideTimer()
      stopAnimation()
    }
  }, [clearHideTimer, stopAnimation])

  const contextValue = useMemo(
    () => ({
      hideToast,
      showToast,
    }),
    [hideToast, showToast],
  )

  const toastColors = current ? resolveToastColors(current.tone) : null

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        {current ? (
          <View pointerEvents="none" style={[styles.slot, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Animated.View
              style={[
                styles.toast,
                {
                  backgroundColor: toastColors?.backgroundColor,
                  borderColor: toastColors?.borderColor,
                  opacity,
                  shadowColor: theme.isDark ? "#000000" : "#0F172A",
                  transform: [{ translateY }],
                },
              ]}
            >
              <Text style={styles.message}>{current.message}</Text>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slot: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      default: {},
    }),
  },
})

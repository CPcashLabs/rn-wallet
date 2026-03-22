import React, { type PropsWithChildren, useCallback, useMemo } from "react"

import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Toast, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message"

import { ToastContext, type ToastInput, type ToastTone } from "@/shared/toast/ToastContext"
import type { AppTheme } from "@/shared/theme/tokens"
import { useAppTheme } from "@/shared/theme/useAppTheme"

const DEFAULT_DURATION = 2200

type NormalizedToastInput = {
  duration: number
  message: string
  tone: ToastTone
}

function normalizeToast(input: ToastInput): NormalizedToastInput {
  if (typeof input === "string") {
    return {
      duration: DEFAULT_DURATION,
      message: input,
      tone: "default",
    }
  }

  return {
    duration: input.duration ?? DEFAULT_DURATION,
    message: input.message,
    tone: input.tone ?? "default",
  }
}

function resolveToastColors(theme: AppTheme, tone: ToastTone) {
  switch (tone) {
    case "success":
      return { backgroundColor: theme.colors.success, borderColor: theme.colors.successBorder }
    case "warning":
      return { backgroundColor: theme.colors.warningEmphasis, borderColor: theme.colors.warningBorder }
    case "error":
      return { backgroundColor: theme.colors.dangerEmphasis, borderColor: theme.colors.dangerBorder }
    default:
      return { backgroundColor: theme.colors.toastDefaultBackground, borderColor: theme.colors.toastDefaultBorder }
  }
}

function mapToastToneToType(tone: ToastTone) {
  switch (tone) {
    case "success":
      return "success"
    case "warning":
      return "warning"
    case "error":
      return "error"
    default:
      return "default"
  }
}

function AppToastCard({
  params,
  theme,
  tone,
}: {
  params: ToastConfigParams<undefined>
  theme: AppTheme
  tone: ToastTone
}) {
  const colors = resolveToastColors(theme, tone)

  return (
    <Pressable
      onPress={params.onPress}
      style={[
        styles.toast,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          shadowColor: theme.isDark ? "#000000" : "#0F172A",
        },
      ]}
    >
      <View style={styles.messageWrap}>
        <Text style={styles.message}>{params.text1}</Text>
      </View>
    </Pressable>
  )
}

function createToastConfig(theme: AppTheme): ToastConfig {
  return {
    default: params => <AppToastCard params={params} theme={theme} tone="default" />,
    success: params => <AppToastCard params={params} theme={theme} tone="success" />,
    warning: params => <AppToastCard params={params} theme={theme} tone="warning" />,
    error: params => <AppToastCard params={params} theme={theme} tone="error" />,
  }
}

export function ToastProvider({ children }: PropsWithChildren) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  const bottomOffset = Math.max(insets.bottom, 16) + 8
  const toastConfig = useMemo(() => createToastConfig(theme), [theme])

  const hideToast = useCallback(() => {
    Toast.hide()
  }, [])

  const showToast = useCallback(
    (input: ToastInput) => {
      const toast = normalizeToast(input)
      if (!toast.message.trim()) {
        return
      }

      Toast.show({
        autoHide: true,
        bottomOffset,
        onPress: () => {
          Toast.hide()
        },
        position: "bottom",
        swipeable: true,
        text1: toast.message,
        type: mapToastToneToType(toast.tone),
        visibilityTime: toast.duration,
      })
    },
    [bottomOffset],
  )

  const contextValue = useMemo(
    () => ({
      hideToast,
      showToast,
    }),
    [hideToast, showToast],
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        autoHide
        avoidKeyboard
        bottomOffset={bottomOffset}
        config={toastConfig}
        position="bottom"
        swipeable
        visibilityTime={DEFAULT_DURATION}
      />
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
  messageWrap: {
    flex: 1,
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
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: {
          width: 0,
          height: 10,
        },
      },
      default: {},
    }),
  },
})

export { DEFAULT_DURATION, mapToastToneToType, normalizeToast }

import { useCallback } from "react"

import { Alert } from "react-native"
import { useTranslation } from "react-i18next"

import { resolveErrorMessage, type ErrorMessageOptions } from "@/shared/errors/presentation"
import { logErrorSafely } from "@/shared/logging/safeConsole"
import type { ToastTone } from "@/shared/toast/ToastContext"
import { useToast } from "@/shared/toast/useToast"

type PresentMessageOptions = {
  mode?: "alert" | "toast"
  titleKey?: string
  tone?: ToastTone
}

type PresentErrorOptions = ErrorMessageOptions &
  PresentMessageOptions & {
    logTag?: string
    log?: boolean
    logToConsole?: boolean
  }

export function useErrorPresenter() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const presentMessage = useCallback(
    (message: string, options?: PresentMessageOptions) => {
      if (options?.mode === "toast") {
        showToast({
          message,
          tone: options.tone ?? "error",
        })
        return message
      }

      Alert.alert(t(options?.titleKey ?? "common.errorTitle"), message)
      return message
    },
    [showToast, t],
  )

  const presentError = useCallback(
    (error: unknown, options: PresentErrorOptions) => {
      const message = resolveErrorMessage(t, error, options)
      const shouldLog = options.log ?? __DEV__

      if (shouldLog) {
        logErrorSafely(options.logTag ?? "[error]", error, {
          context: {
            resolvedMessage: message,
          },
          forwardToConsole: options.logToConsole ?? false,
        })
      }

      return presentMessage(message, options)
    },
    [presentMessage, t],
  )

  return {
    presentError,
    presentMessage,
  }
}

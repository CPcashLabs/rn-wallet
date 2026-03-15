import React, { type PropsWithChildren, useEffect } from "react"

import { AppState } from "react-native"
import { I18nextProvider } from "react-i18next"

import { hydrateI18n, i18n } from "@/shared/i18n"

export function I18nProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        void hydrateI18n()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

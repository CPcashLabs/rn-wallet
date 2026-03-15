import React from "react"

import { useTranslation } from "react-i18next"

import { PlaceholderScreen } from "@/shared/ui/PlaceholderScreen"

export function BootScreen() {
  const { t } = useTranslation()

  return (
    <PlaceholderScreen
      title={t("common.bootstrap.title")}
      description={t("common.bootstrap.description")}
    />
  )
}

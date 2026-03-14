import React from "react"

import { Alert } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { SupportPanel, SupportScaffold } from "@/features/support/components/SupportScaffold"
import { goBackOrReset } from "@/features/support/utils/supportNavigation"
import { openSupportUrl, UPDATE_LOG_URL } from "@/features/support/utils/supportLinks"

import type { SupportStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SupportStackParamList, "MaintenanceScreen">

export function MaintenanceScreen({ navigation, route }: Props) {
  const { t } = useTranslation()

  const openLog = async () => {
    try {
      await openSupportUrl(UPDATE_LOG_URL)
    } catch {
      Alert.alert(t("common.errorTitle"), t("support.common.openFailed"))
    }
  }

  const statusBody = route.params?.reason === "bootstrap_failed" ? t("support.maintenance.bootstrapHint") : t("support.maintenance.statusBody")

  return (
    <SupportScaffold
      accentColor="#F97316"
      actions={[
        {
          label: t("support.maintenance.viewLog"),
          onPress: () => void openLog(),
        },
        {
          label: t("support.common.retry"),
          onPress: () => goBackOrReset(navigation),
          variant: "secondary",
        },
      ]}
      backLabel={t("support.common.back")}
      canGoBack={navigation.canGoBack()}
      eyebrow={t("support.maintenance.eyebrow")}
      heroLabel="UP"
      onBack={() => navigation.goBack()}
      subtitle={t("support.maintenance.subtitle")}
      title={t("support.maintenance.title")}
    >
      <SupportPanel accentColor="#F97316" body={statusBody} title={t("support.maintenance.statusTitle")} />
    </SupportScaffold>
  )
}

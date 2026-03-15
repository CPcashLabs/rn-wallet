import React from "react"

import { Alert } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { SupportPanel, SupportScaffold } from "@/features/support/components/SupportScaffold"
import { goBackOrReset } from "@/features/support/utils/supportNavigation"
import { getSupportGuideUrl, openSupportUrl } from "@/features/support/utils/supportLinks"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { SupportStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SupportStackParamList, "AddDesktopGuideScreen">

export function AddDesktopGuideScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()

  const openGuide = async () => {
    try {
      await openSupportUrl(getSupportGuideUrl())
    } catch {
      Alert.alert(t("common.errorTitle"), t("support.common.openFailed"))
    }
  }

  return (
    <SupportScaffold
      accentColor={theme.colors.successBorder}
      actions={[
        {
          label: t("support.common.openGuide"),
          onPress: () => void openGuide(),
        },
        {
          label: t("support.common.gotIt"),
          onPress: () => goBackOrReset(navigation),
          variant: "secondary",
        },
      ]}
      backLabel={t("support.common.back")}
      canGoBack={navigation.canGoBack()}
      eyebrow={t("support.addDesktop.eyebrow")}
      heroLabel="APP"
      onBack={() => navigation.goBack()}
      subtitle={t("support.addDesktop.subtitle")}
      title={t("support.addDesktop.title")}
    >
      <SupportPanel accentColor={theme.colors.successBorder} body={t("support.addDesktop.step1Body")} title={t("support.addDesktop.step1Title")} />
      <SupportPanel accentColor={theme.colors.successBorder} body={t("support.addDesktop.step2Body")} title={t("support.addDesktop.step2Title")} />
      <SupportPanel accentColor={theme.colors.successBorder} body={t("support.addDesktop.step3Body")} title={t("support.addDesktop.step3Title")} />
    </SupportScaffold>
  )
}

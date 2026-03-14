import React from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { SupportPanel, SupportScaffold } from "@/features/support/components/SupportScaffold"
import { goBackOrReset, resetToEntryScreen } from "@/features/support/utils/supportNavigation"

import type { SupportStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SupportStackParamList, "NotFoundScreen">

export function NotFoundScreen({ navigation, route }: Props) {
  const { t } = useTranslation()

  return (
    <SupportScaffold
      accentColor="#475569"
      actions={[
        {
          label: t("support.common.returnHome"),
          onPress: resetToEntryScreen,
        },
        {
          label: t("support.common.back"),
          onPress: () => goBackOrReset(navigation),
          variant: "secondary",
        },
      ]}
      backLabel={t("support.common.back")}
      canGoBack={navigation.canGoBack()}
      eyebrow={t("support.notFound.eyebrow")}
      heroLabel="404"
      onBack={() => navigation.goBack()}
      subtitle={t("support.notFound.subtitle")}
      title={t("support.notFound.title")}
    >
      <SupportPanel accentColor="#475569" body={t("support.notFound.body")} title={t("support.notFound.nextTitle")} />
      {route.params?.path ? <SupportPanel accentColor="#475569" body={route.params.path} title={t("support.notFound.pathLabel")} /> : null}
    </SupportScaffold>
  )
}

import React from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { resetToRecoverableRoute } from "@/app/navigation/navigationRef"
import { SupportPanel, SupportScaffold } from "@/features/support/components/SupportScaffold"
import { goBackOrReset, resetToEntryScreen } from "@/features/support/utils/supportNavigation"

import type { SupportStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SupportStackParamList, "NoNetworkScreen">

export function NoNetworkScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const isDetailed = route.params?.mode === "details"

  return (
    <SupportScaffold
      accentColor="#2563EB"
      actions={[
        {
          label: t("support.common.retry"),
          onPress: () => {
            if (!resetToRecoverableRoute()) {
              goBackOrReset(navigation)
            }
          },
        },
        isDetailed
          ? {
              label: t("support.common.returnHome"),
              onPress: resetToEntryScreen,
              variant: "secondary",
            }
          : {
              label: t("support.common.troubleshooting"),
              onPress: () => navigation.setParams({ mode: "details" }),
              variant: "secondary",
            },
      ]}
      backLabel={t("support.common.back")}
      canGoBack={navigation.canGoBack()}
      eyebrow={t("support.noNetwork.eyebrow")}
      heroLabel="OFF"
      onBack={() => navigation.goBack()}
      subtitle={t("support.noNetwork.subtitle")}
      title={t("support.noNetwork.title")}
    >
      {route.params?.failedPath ? (
        <SupportPanel accentColor="#2563EB" body={route.params.failedPath} title={t("support.noNetwork.requestedTarget")} />
      ) : null}

      <SupportPanel accentColor="#2563EB" body={t("support.noNetwork.quickBody")} title={t("support.noNetwork.quickTitle")} />

      {isDetailed ? (
        <>
          <SupportPanel
            accentColor="#2563EB"
            items={[t("support.noNetwork.step1Item1"), t("support.noNetwork.step1Item2")]}
            title={t("support.noNetwork.step1Title")}
          />
          <SupportPanel
            accentColor="#2563EB"
            items={[t("support.noNetwork.step2Item1"), t("support.noNetwork.step2Item2")]}
            title={t("support.noNetwork.step2Title")}
          />
          <SupportPanel
            accentColor="#2563EB"
            items={[t("support.noNetwork.step3Item1"), t("support.noNetwork.step3Item2")]}
            title={t("support.noNetwork.step3Title")}
          />
        </>
      ) : null}
    </SupportScaffold>
  )
}

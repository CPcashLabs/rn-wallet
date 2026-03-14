import React from "react"

import { Alert } from "react-native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useTranslation } from "react-i18next"

import { SupportPanel, SupportScaffold } from "@/features/support/components/SupportScaffold"
import { resetToEntryScreen } from "@/features/support/utils/supportNavigation"
import { getSupportGuideUrl, openSupportUrl } from "@/features/support/utils/supportLinks"

import type { SupportStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<SupportStackParamList, "WechatInterceptorScreen">

export function WechatInterceptorScreen({ navigation, route }: Props) {
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
      accentColor="#0F62FE"
      actions={[
        {
          label: t("support.common.openGuide"),
          onPress: () => void openGuide(),
        },
        {
          label: t("support.common.returnHome"),
          onPress: resetToEntryScreen,
          variant: "secondary",
        },
      ]}
      backLabel={t("support.common.back")}
      canGoBack={navigation.canGoBack()}
      eyebrow={t("support.wechatInterceptor.eyebrow")}
      heroLabel="WX"
      onBack={() => navigation.goBack()}
      subtitle={t("support.wechatInterceptor.subtitle")}
      title={t("support.wechatInterceptor.title")}
    >
      <SupportPanel
        accentColor="#0F62FE"
        body={`${t("support.wechatInterceptor.tipContBefore")}${t("support.wechatInterceptor.tipCont")}${t("support.wechatInterceptor.tipContAfter")}`}
        title={t("support.wechatInterceptor.tipTitle")}
      />
      {route.params?.targetPath ? (
        <SupportPanel accentColor="#0F62FE" body={route.params.targetPath} title={t("support.wechatInterceptor.targetLabel")} />
      ) : null}
    </SupportScaffold>
  )
}

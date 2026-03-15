import React from "react"

import { Alert, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { deepLinkAdapter, passkeyAdapter } from "@/shared/native"
import type { AuthStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AuthStackParamList, "PasskeyIntroScreen">

const PASSKEY_GUIDE_URL = "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/quickstart"

export function PasskeyIntroScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const passkeyCapability = passkeyAdapter.getCapability()
  const passkeyActionsEnabled = passkeyCapability.supported

  const openGuide = async () => {
    try {
      const result = await deepLinkAdapter.open(PASSKEY_GUIDE_URL)
      if (!result.ok) {
        throw result.error
      }
    } catch {
      Alert.alert(t("common.errorTitle"), t("auth.errors.openExternalFailed"))
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passkeyIntro.title")}
      subtitle={passkeyActionsEnabled ? t("auth.passkeyIntro.subtitle") : t("auth.errors.passkeyUnavailable")}
    >
      <Text>{passkeyActionsEnabled ? t("auth.passkeyIntro.body") : t("auth.errors.passkeyUnavailable")}</Text>
      <AuthButton
        label={passkeyActionsEnabled ? t("auth.passkeyIntro.learnMore") : t("common.back")}
        onPress={passkeyActionsEnabled ? () => void openGuide() : navigation.goBack}
        variant="secondary"
      />
    </AuthScaffold>
  )
}

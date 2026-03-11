import React from "react"

import { Alert, Linking, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import type { AuthStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AuthStackParamList, "PasskeyIntroScreen">

const PASSKEY_GUIDE_URL = "https://cpcash-1.gitbook.io/cpcash-wallet/wallet-faq/quickstart"

export function PasskeyIntroScreen({ navigation }: Props) {
  const { t } = useTranslation()

  const openGuide = async () => {
    try {
      await Linking.openURL(PASSKEY_GUIDE_URL)
    } catch {
      Alert.alert(t("common.errorTitle"), t("auth.errors.openExternalFailed"))
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passkeyIntro.title")}
      subtitle={t("auth.passkeyIntro.subtitle")}
    >
      <Text>{t("auth.passkeyIntro.body")}</Text>
      <AuthButton label={t("auth.passkeyIntro.learnMore")} onPress={() => void openGuide()} variant="secondary" />
    </AuthScaffold>
  )
}

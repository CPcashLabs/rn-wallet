import React, { useState } from "react"

import { StyleSheet, Text } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { bindInviteCode, saveRecentPasskey, signInWithMessageSignature, updateNickname } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getAuthErrorMessage, getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { passkeyAdapter } from "@/shared/native"

type Props = NativeStackScreenProps<AuthStackParamList, "PasskeySignupScreen">

export function PasskeySignupScreen({ navigation, route }: Props) {
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const inviteCode = route.params?.inviteCode
  const [nickname, setNickname] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      presentMessage(t("auth.errors.nicknameRequired"))
      return
    }

    setSubmitting(true)

    try {
      const result = await passkeyAdapter.register({
        username: nickname.trim(),
      })

      if (!result.ok) {
        throw result.error
      }

      const tokens = await signInWithMessageSignature({
        signature: result.data.signature,
        address: result.data.address,
        message: JSON.stringify(result.data.message),
      })

      await persistAuthenticatedSession({
        ...tokens,
        address: result.data.address,
        loginType: "passkey",
        passkeyRawId: result.data.rawId,
      })

      const nicknameWithSuffix = `${nickname.trim()}${result.data.address.slice(-4)}`
      saveRecentPasskey({
        credentialId: result.data.credentialId,
        rawId: result.data.rawId,
        name: result.data.displayName ?? nicknameWithSuffix,
        address: result.data.address,
      })

      try {
        await updateNickname(nicknameWithSuffix)
      } catch {
        // 昵称更新失败不阻断登录成功链路。
      }

      if (inviteCode) {
        try {
          await bindInviteCode(inviteCode)
        } catch (error) {
          presentMessage(getInviteBindingMessage(error), {
            titleKey: "common.infoTitle",
          })
        }
      }

      resetToMainTabs()
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.passkeyRegisterFailed",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passkeySignup.title")}
      subtitle={t("auth.passkeySignup.subtitle")}
    >
      <AuthTextField
        autoCapitalize="words"
        label={t("auth.passkeySignup.nicknameLabel")}
        onChangeText={setNickname}
        placeholder={t("auth.passkeySignup.nicknamePlaceholder")}
        value={nickname}
      />

      <Text style={styles.linkText} onPress={() => navigation.navigate("PasskeyIntroScreen")}>
        {t("auth.passkeySignup.helpLink")}
      </Text>

      <AuthButton disabled={!nickname.trim()} label={t("common.next")} loading={submitting} onPress={() => void handleSubmit()} />
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F766E",
    textAlign: "center",
  },
})

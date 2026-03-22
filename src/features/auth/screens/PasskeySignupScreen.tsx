import React, { useMemo, useState } from "react"

import { StyleSheet, Text } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { bindInviteCode, saveRecentPasskey, signInWithMessageSignature, updateNickname } from "@/features/auth/services/authApi"
import { persistAuthenticatedSession } from "@/features/auth/services/authSessionOrchestrator"
import { getInviteBindingMessage } from "@/features/auth/utils/authMessages"
import { createNicknameSchema } from "@/features/auth/utils/authEntryFormSchemas"
import { resetToMainTabs } from "@/app/navigation/navigationRef"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { passkeyAdapter } from "@/shared/native"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "PasskeySignupScreen">

type PasskeySignupFormValues = {
  nickname: string
}

export function PasskeySignupScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError, presentMessage } = useErrorPresenter()
  const inviteCode = route.params?.inviteCode
  const passkeyCapability = passkeyAdapter.getCapability()
  const passkeyActionsEnabled = passkeyCapability.supported
  const [submitting, setSubmitting] = useState(false)
  const nicknameSchema = useMemo(
    () =>
      createNicknameSchema({
        nicknameRequired: t("auth.errors.nicknameRequired"),
      }),
    [t],
  )
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<PasskeySignupFormValues>({
    defaultValues: {
      nickname: "",
    },
    mode: "onChange",
    resolver: zodResolver(nicknameSchema),
  })

  const submit = handleSubmit(async values => {
    if (!passkeyActionsEnabled) {
      presentMessage(passkeyCapability.reason ?? t("auth.errors.passkeyUnavailable"))
      return
    }

    setSubmitting(true)

    try {
      const result = await passkeyAdapter.register({
        username: values.nickname.trim(),
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

      const nicknameWithSuffix = `${values.nickname.trim()}${result.data.address.slice(-4)}`
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
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.passkeySignup.title")}
      subtitle={passkeyActionsEnabled ? t("auth.passkeySignup.subtitle") : t("auth.errors.passkeyUnavailable")}
    >
      {passkeyActionsEnabled ? (
        <>
          <Controller
            control={control}
            name="nickname"
            render={({ field: { onBlur, onChange, value }, fieldState }) => (
              <AuthTextField
                autoCapitalize="words"
                error={fieldState.error?.message ?? null}
                label={t("auth.passkeySignup.nicknameLabel")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("auth.passkeySignup.nicknamePlaceholder")}
                value={value}
              />
            )}
          />

          <Text style={[styles.linkText, { color: theme.colors.success }]} onPress={() => navigation.navigate("PasskeyIntroScreen")}>
            {t("auth.passkeySignup.helpLink")}
          </Text>

          <AuthButton disabled={!isValid || submitting} label={t("common.next")} loading={submitting} onPress={() => void submit()} />
        </>
      ) : (
        <AuthButton label={t("common.back")} onPress={navigation.goBack} variant="secondary" />
      )}
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
})

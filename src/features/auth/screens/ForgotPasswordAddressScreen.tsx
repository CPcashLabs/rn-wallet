import React, { useMemo, useState } from "react"

import { StyleSheet, Text, View } from "react-native"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getEmailByAddress } from "@/features/auth/services/authApi"
import { createAddressSchema } from "@/features/auth/utils/authEntryFormSchemas"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useErrorPresenter } from "@/shared/errors/useErrorPresenter"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordAddressScreen">

type ForgotPasswordAddressFormValues = {
  address: string
}

export function ForgotPasswordAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { presentError } = useErrorPresenter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const addressSchema = useMemo(
    () =>
      createAddressSchema({
        addressRequired: t("auth.errors.addressRequired"),
      }),
    [t],
  )
  const {
    control,
    formState: { isValid },
    handleSubmit,
    watch,
  } = useForm<ForgotPasswordAddressFormValues>({
    defaultValues: {
      address: route.params?.address ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(addressSchema),
  })
  const address = watch("address")

  const lookupEmail = handleSubmit(async values => {
    setLoading(true)

    try {
      const nextEmail = await getEmailByAddress(values.address.trim())
      setEmail(nextEmail)
    } catch (error) {
      presentError(error, {
        fallbackKey: "auth.errors.lookupEmailFailed",
      })
    } finally {
      setLoading(false)
    }
  })

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.forgotPasswordAddress.title")}
      subtitle={t("auth.forgotPasswordAddress.subtitle")}
    >
      <Controller
        control={control}
        name="address"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <AuthTextField
            error={fieldState.error?.message ?? null}
            label={t("auth.passwordLogin.addressLabel")}
            onBlur={onBlur}
            onChangeText={nextValue => {
              onChange(nextValue)
              setEmail("")
            }}
            placeholder={t("auth.passwordLogin.addressPlaceholder")}
            value={value}
          />
        )}
      />
      <AuthButton disabled={!isValid || loading} label={t("auth.forgotPasswordAddress.lookupButton")} loading={loading} onPress={() => void lookupEmail()} />

      {email ? (
        <View
          style={[
            styles.emailCard,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.emailLabel, { color: theme.colors.mutedText }]}>
            {t("auth.forgotPasswordAddress.emailLabel")}
          </Text>
          <Text style={[styles.emailValue, { color: theme.colors.text }]}>
            {email}
          </Text>
          <AuthButton
            label={t("common.next")}
            onPress={() =>
              navigation.navigate("ForgotPasswordEmailScreen", {
                address: address.trim(),
                email,
              })
            }
          />
        </View>
      ) : null}
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  emailCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  emailLabel: {
    fontSize: 12,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: "700",
  },
})

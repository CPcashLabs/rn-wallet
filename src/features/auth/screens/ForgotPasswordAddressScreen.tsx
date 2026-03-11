import React, { useState } from "react"

import { Alert, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { AuthScaffold } from "@/features/auth/components/AuthScaffold"
import { AuthTextField } from "@/features/auth/components/AuthTextField"
import { getEmailByAddress } from "@/features/auth/services/authApi"
import { getAuthErrorMessage } from "@/features/auth/utils/authMessages"
import type { AuthStackParamList } from "@/app/navigation/types"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordAddressScreen">

export function ForgotPasswordAddressScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const [address, setAddress] = useState(route.params?.address ?? "")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const lookupEmail = async () => {
    if (!address.trim()) {
      Alert.alert(t("common.errorTitle"), t("auth.errors.addressRequired"))
      return
    }

    setLoading(true)

    try {
      const nextEmail = await getEmailByAddress(address.trim())
      setEmail(nextEmail)
    } catch (error) {
      Alert.alert(t("common.errorTitle"), getAuthErrorMessage(error, "auth.errors.lookupEmailFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("auth.forgotPasswordAddress.title")}
      subtitle={t("auth.forgotPasswordAddress.subtitle")}
    >
      <AuthTextField
        label={t("auth.passwordLogin.addressLabel")}
        onChangeText={setAddress}
        placeholder={t("auth.passwordLogin.addressPlaceholder")}
        value={address}
      />
      <AuthButton label={t("auth.forgotPasswordAddress.lookupButton")} loading={loading} onPress={() => void lookupEmail()} />

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

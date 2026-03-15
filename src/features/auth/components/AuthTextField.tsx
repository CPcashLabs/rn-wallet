import React from "react"

import { View } from "react-native"
import { useTranslation } from "react-i18next"

import { AppTextField } from "@/shared/ui/AppTextField"

export function AuthTextField(props: {
  label?: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  editable?: boolean
  keyboardType?: "default" | "email-address"
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  autoCorrect?: boolean
  error?: string | null
  helperText?: string | null
  multiline?: boolean
  numberOfLines?: number
  rightSlot?: React.ReactNode
  secureToggleLabels?: {
    show: string
    hide: string
  }
}) {
  const { t } = useTranslation()
  const secureToggleLabels = React.useMemo(
    () => props.secureToggleLabels ?? { show: t("home.shell.show"), hide: t("home.shell.hide") },
    [props.secureToggleLabels, t],
  )

  return (
    <View>
      <AppTextField
        autoCapitalize={props.autoCapitalize}
        autoCorrect={props.autoCorrect}
        editable={props.editable}
        error={props.error}
        helperText={props.helperText}
        keyboardType={props.keyboardType}
        label={props.label}
        multiline={props.multiline}
        numberOfLines={props.numberOfLines}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        rightSlot={props.rightSlot}
        secureTextEntry={props.secureTextEntry}
        secureToggleLabels={secureToggleLabels}
        value={props.value}
        variant="auth"
      />
    </View>
  )
}

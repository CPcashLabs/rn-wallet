import React from "react"

import { View } from "react-native"

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
  rightSlot?: React.ReactNode
}) {
  return (
    <View>
      <AppTextField
        autoCapitalize={props.autoCapitalize}
        autoCorrect={props.autoCorrect}
        editable={props.editable}
        error={props.error}
        keyboardType={props.keyboardType}
        label={props.label}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        rightSlot={props.rightSlot}
        secureTextEntry={props.secureTextEntry}
        secureToggleLabels={{ show: "显示", hide: "隐藏" }}
        value={props.value}
        variant="auth"
      />
    </View>
  )
}

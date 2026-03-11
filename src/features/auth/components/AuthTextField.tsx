import React, { useMemo, useState } from "react"

import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

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
  const theme = useAppTheme()
  const [masked, setMasked] = useState(Boolean(props.secureTextEntry))
  const editable = props.editable ?? true
  const shouldMask = props.secureTextEntry ? masked : false

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        color: theme.colors.text,
      },
    ],
    [theme.colors.text],
  )

  return (
    <View style={styles.wrapper}>
      {props.label ? (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {props.label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: props.error ? "#DC2626" : theme.colors.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize={props.autoCapitalize ?? "none"}
          autoCorrect={props.autoCorrect ?? false}
          editable={editable}
          keyboardType={props.keyboardType ?? "default"}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.mutedText}
          secureTextEntry={shouldMask}
          style={inputStyle}
          value={props.value}
        />
        {props.secureTextEntry ? (
          <Pressable onPress={() => setMasked(previous => !previous)} style={styles.action}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {masked ? "显示" : "隐藏"}
            </Text>
          </Pressable>
        ) : null}
        {props.rightSlot ? <View style={styles.rightSlot}>{props.rightSlot}</View> : null}
      </View>
      {props.error ? (
        <Text style={styles.errorText}>
          {props.error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  action: {
    marginLeft: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rightSlot: {
    marginLeft: 12,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#DC2626",
  },
})

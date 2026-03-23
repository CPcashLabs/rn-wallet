import React, { useMemo, useState } from "react"

import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native"

import { useAppTheme } from "@/shared/theme/useAppTheme"

type AppTextFieldProps = Omit<TextInputProps, "style" | "value" | "onChangeText"> & {
  label?: string
  value: string
  onChangeText: (value: string) => void
  error?: string | null
  helperText?: string | null
  rightSlot?: React.ReactNode
  variant?: "default" | "auth"
  backgroundTone?: "surface" | "background"
  containerStyle?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
  secureToggleLabels?: {
    show: string
    hide: string
  }
}

export const AppTextField = React.memo(function AppTextField(props: AppTextFieldProps) {
  const theme = useAppTheme()
  const {
    label,
    value,
    onChangeText,
    error,
    helperText,
    rightSlot,
    variant = "default",
    backgroundTone = "background",
    containerStyle,
    inputStyle,
    secureToggleLabels,
    secureTextEntry,
    multiline,
    editable,
    ...inputProps
  } = props
  const [masked, setMasked] = useState(Boolean(secureTextEntry))
  const preset = variant === "auth" ? theme.components.textField.auth : theme.components.textField.default
  const shouldMask = secureTextEntry ? masked : false
  const resolvedBackgroundColor =
    backgroundTone === "surface"
      ? theme.colors.surfaceElevated ?? theme.colors.surface
      : theme.colors.surfaceMuted ?? theme.colors.background
  const helperColor = error ? theme.colors.danger : theme.colors.mutedText
  const resolvedInputStyle = useMemo(() => {
    return [
      styles.input,
      theme.typography.body,
      {
        paddingVertical: theme.components.textField.paddingY,
        minHeight: multiline ? theme.components.textField.multilineMinHeight : undefined,
      },
      multiline ? styles.multilineInput : null,
      {
        color: theme.colors.text,
      },
      inputStyle,
    ]
  }, [inputStyle, multiline, theme.colors.text, theme.typography.body])

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, theme.typography.footnoteEmphasized, variant === "auth" ? styles.labelAuth : null, { color: theme.colors.text }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.fieldContainer,
          theme.shadows.control,
          {
            minHeight: preset.minHeight,
            borderRadius: preset.radius,
            paddingHorizontal: preset.paddingX,
            backgroundColor: resolvedBackgroundColor,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            alignItems: multiline ? "flex-start" : "center",
            borderWidth: theme.components.textField.borderWidth,
          },
          containerStyle,
        ]}
      >
        <TextInput
          {...inputProps}
          autoCapitalize={props.autoCapitalize ?? "none"}
          autoCorrect={props.autoCorrect ?? false}
          editable={editable ?? true}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholderTextColor={theme.colors.mutedText}
          secureTextEntry={shouldMask}
          style={resolvedInputStyle}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
        />
        {secureTextEntry && secureToggleLabels ? (
          <Pressable
            hitSlop={8}
            onPress={() => setMasked(previous => !previous)}
            style={[
              styles.action,
              {
                marginLeft: theme.spacing.sm,
                minHeight: theme.components.secureToggle.minHeight,
                minWidth: theme.components.secureToggle.minWidth,
              },
            ]}
          >
            <Text style={[styles.actionText, theme.typography.subheadlineEmphasized, { color: theme.colors.primary }]}>
              {masked ? secureToggleLabels.show : secureToggleLabels.hide}
            </Text>
          </Pressable>
        ) : null}
        {rightSlot ? (
          <View
            style={[
              styles.rightSlot,
              multiline ? styles.multilineRightSlot : null,
              {
                marginLeft: theme.spacing.sm,
              },
            ]}
          >
            {rightSlot}
          </View>
        ) : null}
      </View>
      {error || helperText ? <Text style={[styles.helperText, theme.typography.footnote, { color: helperColor }]}>{error || helperText}</Text> : null}
    </View>
  )
})

AppTextField.displayName = "AppTextField"

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
  },
  labelAuth: {
    fontWeight: "600",
  },
  fieldContainer: {
    flexDirection: "row",
  },
  input: {
    flex: 1,
  },
  multilineInput: {
    paddingTop: 12,
  },
  action: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
  },
  rightSlot: {
    alignSelf: "center",
  },
  multilineRightSlot: {
    paddingTop: 12,
    alignSelf: "flex-start",
  },
  helperText: {
  },
})

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
  const preset = variant === "auth" ? stylePresets.auth : stylePresets.default
  const shouldMask = secureTextEntry ? masked : false
  const resolvedBackgroundColor =
    backgroundTone === "surface"
      ? theme.colors.surfaceElevated ?? theme.colors.surface
      : theme.colors.surfaceMuted ?? theme.colors.background
  const helperColor = error ? theme.colors.danger : theme.colors.mutedText
  const resolvedInputStyle = useMemo(() => {
    return [
      styles.input,
      preset.input,
      multiline ? styles.multilineInput : null,
      {
        color: theme.colors.text,
      },
      inputStyle,
    ]
  }, [inputStyle, multiline, preset.input, theme.colors.text])

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, variant === "auth" ? styles.labelAuth : null, { color: theme.colors.text }]}>{label}</Text> : null}
      <View
        style={[
          styles.fieldContainer,
          preset.container,
          {
            backgroundColor: resolvedBackgroundColor,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            alignItems: multiline ? "flex-start" : "center",
            shadowColor: theme.colors.shadow,
            shadowOpacity: theme.isDark ? 0.08 : 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 1,
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
          <Pressable onPress={() => setMasked(previous => !previous)} style={styles.action}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {masked ? secureToggleLabels.show : secureToggleLabels.hide}
            </Text>
          </Pressable>
        ) : null}
        {rightSlot ? <View style={[styles.rightSlot, multiline ? styles.multilineRightSlot : null]}>{rightSlot}</View> : null}
      </View>
      {error || helperText ? <Text style={[styles.helperText, { color: helperColor }]}>{error || helperText}</Text> : null}
    </View>
  )
})

AppTextField.displayName = "AppTextField"

const stylePresets: Record<"default" | "auth", { container: ViewStyle; input: TextStyle }> = {
  default: {
    container: {
      minHeight: 54,
      borderRadius: 20,
      paddingHorizontal: 18,
    },
    input: {
      paddingVertical: 14,
      fontSize: 16,
      lineHeight: 22,
    },
  },
  auth: {
    container: {
      minHeight: 54,
      borderRadius: 22,
      paddingHorizontal: 18,
    },
    input: {
      paddingVertical: 14,
      fontSize: 16,
    },
  },
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  labelAuth: {
    fontWeight: "600",
  },
  fieldContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  input: {
    flex: 1,
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  action: {
    marginLeft: 12,
    alignSelf: "center",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rightSlot: {
    marginLeft: 12,
    alignSelf: "center",
  },
  multilineRightSlot: {
    paddingTop: 12,
    alignSelf: "flex-start",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
})

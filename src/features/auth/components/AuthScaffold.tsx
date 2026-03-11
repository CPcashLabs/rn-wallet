import React from "react"

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function AuthScaffold(props: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  canGoBack?: boolean
  onBack?: () => void
}) {
  const theme = useAppTheme()

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.header}>
              {props.canGoBack ? (
                <Pressable onPress={props.onBack} style={styles.backButton}>
                  <Text style={[styles.backText, { color: theme.colors.primary }]}>
                    返回
                  </Text>
                </Pressable>
              ) : null}
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {props.title}
              </Text>
              {props.subtitle ? (
                <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>
                  {props.subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.body}>{props.children}</View>
          </View>
        </ScrollView>
        {props.footer ? (
          <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
            {props.footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  body: {
    gap: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
})

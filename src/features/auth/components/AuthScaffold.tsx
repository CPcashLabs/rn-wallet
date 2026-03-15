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
import { useTranslation } from "react-i18next"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export function AuthScaffold(props: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  canGoBack?: boolean
  onBack?: () => void
  headerContent?: React.ReactNode
}) {
  const { t } = useTranslation()
  const theme = useAppTheme()

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.ambientOrb, styles.ambientOrbTop, { backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}18` }]} />
        <View style={[styles.ambientOrb, styles.ambientOrbBottom, { backgroundColor: theme.colors.surfaceMuted ?? theme.colors.surface }]} />
      </View>
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
                backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
                shadowOpacity: theme.isDark ? 0.22 : 0.1,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 16 },
                elevation: 5,
              },
            ]}
          >
            <View style={styles.header}>
              {props.canGoBack ? (
                <Pressable onPress={props.onBack} style={styles.backButton}>
                  <Text style={[styles.backText, { color: theme.colors.primary }]}>
                    {`‹ ${t("common.back")}`}
                  </Text>
                </Pressable>
              ) : null}
              {props.headerContent ? (
                props.headerContent
              ) : (
                <>
                  {props.title ? (
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                      {props.title}
                    </Text>
                  ) : null}
                  {props.subtitle ? (
                    <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>
                      {props.subtitle}
                    </Text>
                  ) : null}
                </>
              )}
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
    borderRadius: 32,
    padding: 24,
    gap: 28,
  },
  header: {
    gap: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    letterSpacing: -0.8,
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
  ambientOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  ambientOrbTop: {
    width: 240,
    height: 240,
    top: -80,
    right: -40,
  },
  ambientOrbBottom: {
    width: 280,
    height: 280,
    bottom: -140,
    left: -120,
    opacity: 0.8,
  },
})

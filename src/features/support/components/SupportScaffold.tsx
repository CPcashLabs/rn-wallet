import React from "react"

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAppTheme } from "@/shared/theme/useAppTheme"

export type SupportAction = {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary"
}

type Props = {
  title: string
  subtitle: string
  heroLabel: string
  eyebrow?: string
  accentColor?: string
  canGoBack?: boolean
  onBack?: () => void
  backLabel?: string
  actions?: SupportAction[]
  children?: React.ReactNode
}

function withAlpha(color: string, alpha: string) {
  return color.startsWith("#") && color.length === 7 ? `${color}${alpha}` : color
}

export function SupportScaffold({
  title,
  subtitle,
  heroLabel,
  eyebrow,
  accentColor = "#2563EB",
  canGoBack,
  onBack,
  backLabel,
  actions,
  children,
}: Props) {
  const theme = useAppTheme()
  const secondaryColor = withAlpha(accentColor, "14")
  const heroHalo = withAlpha(accentColor, "20")
  const heroShadow = withAlpha(accentColor, "33")
  const actionList = actions ?? []

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View pointerEvents="none" style={[styles.orbTop, { backgroundColor: secondaryColor }]} />
      <View pointerEvents="none" style={[styles.orbBottom, { backgroundColor: secondaryColor }]} />

      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          {canGoBack ? (
            <Pressable onPress={onBack} style={styles.topButton}>
              <Text style={[styles.topButtonText, { color: theme.colors.mutedText }]}>{backLabel ?? "Back"}</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.heroHalo, { backgroundColor: heroHalo }]} />
          <View style={[styles.heroBadge, { backgroundColor: accentColor, shadowColor: heroShadow }]}>
            <Text style={styles.heroBadgeText}>{heroLabel}</Text>
          </View>

          {eyebrow ? <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>{subtitle}</Text>
        </View>

        <View style={styles.content}>{children}</View>
      </ScrollView>

      {actionList.length ? (
        <View style={[styles.actionBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {actionList.map(action => {
            const isPrimary = action.variant !== "secondary"

            return (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                style={[
                  styles.actionButton,
                  isPrimary
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.actionText, { color: isPrimary ? "#FFFFFF" : theme.colors.text }]}>{action.label}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </SafeAreaView>
  )
}

export function SupportPanel(props: {
  title: string
  body?: string
  items?: string[]
  accentColor?: string
}) {
  const theme = useAppTheme()
  const accentColor = props.accentColor ?? theme.colors.primary

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.panelAccent, { backgroundColor: accentColor }]} />
      <View style={styles.panelBody}>
        <Text style={[styles.panelTitle, { color: theme.colors.text }]}>{props.title}</Text>
        {props.body ? <Text style={[styles.panelText, { color: theme.colors.mutedText }]}>{props.body}</Text> : null}
        {props.items?.map(item => (
          <View key={item} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: accentColor }]} />
            <Text style={[styles.panelText, styles.bulletText, { color: theme.colors.mutedText }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  topRow: {
    minHeight: 44,
    justifyContent: "center",
  },
  topButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 12,
  },
  topButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  orbTop: {
    position: "absolute",
    top: -64,
    right: -32,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  orbBottom: {
    position: "absolute",
    bottom: 96,
    left: -64,
    width: 144,
    height: 144,
    borderRadius: 72,
  },
  heroCard: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 10,
  },
  heroHalo: {
    position: "absolute",
    top: -18,
    right: -28,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  heroBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 4,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
  },
  content: {
    gap: 12,
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  panelAccent: {
    width: 4,
    borderRadius: 999,
  },
  panelBody: {
    flex: 1,
    gap: 8,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  panelText: {
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
  },
})

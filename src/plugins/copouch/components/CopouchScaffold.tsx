import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { closeCopouchStack } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/shared/ui/HomeScaffold"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = React.ComponentProps<typeof HomeScaffold>

export function CopouchScaffold({ children, right, contentContainerStyle, ...props }: Props) {
  return (
    <HomeScaffold {...props} contentContainerStyle={[styles.content, contentContainerStyle]} right={<CopouchCloseButton />}>
      {right ? <View style={styles.topActionsRow}>{right}</View> : null}
      {children}
    </HomeScaffold>
  )
}

function CopouchCloseButton() {
  const theme = useAppTheme()
  const { t } = useTranslation()

  return (
    <Pressable hitSlop={8} onPress={closeCopouchStack} style={styles.closeButton}>
      <Text style={[styles.closeText, { color: theme.colors.primary }]}>{t("common.close")}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingTop: 4,
    paddingBottom: 124,
  },
  topActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  closeButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
})

import React from "react"

import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { resetToMainTabs } from "@/app/navigation/navigationRef"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { usePluginRuntime } from "@/shared/plugins/PluginRuntimeProvider"
import { useAppTheme } from "@/shared/theme/useAppTheme"

type Props = React.ComponentProps<typeof HomeScaffold>

export function CopouchScaffold({ children, right, ...props }: Props) {
  const pluginRuntime = usePluginRuntime()

  return (
    <HomeScaffold {...props} right={!pluginRuntime ? <CopouchCloseButton /> : null}>
      {right ? <View style={styles.topActionsRow}>{right}</View> : null}
      {children}
    </HomeScaffold>
  )
}

function CopouchCloseButton() {
  const theme = useAppTheme()
  const { t } = useTranslation()

  return (
    <Pressable hitSlop={8} onPress={resetToMainTabs} style={styles.closeButton}>
      <Text style={[styles.closeText, { color: theme.colors.primary }]}>{t("common.close")}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  topActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "700",
  },
})

import React from "react"

import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { AuthButton } from "@/features/auth/components/AuthButton"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import type { PasskeyHistoryItem } from "@/shared/types/auth"

export function PasskeyHistoryModal(props: {
  visible: boolean
  items: PasskeyHistoryItem[]
  loading?: boolean
  onClose: () => void
  onSelect: (item?: PasskeyHistoryItem) => void
  onSignUp: () => void
}) {
  const theme = useAppTheme()
  const { t } = useTranslation()

  return (
    <Modal animationType="fade" transparent visible={props.visible} onRequestClose={props.onClose}>
      <Pressable onPress={props.onClose} style={styles.backdrop}>
        <Pressable
          onPress={event => event.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("auth.passkeyHistory.title")}
          </Text>

          <View style={styles.list}>
            {props.items.map(item => (
              <Pressable
                key={item.credentialId}
                disabled={props.loading}
                onPress={() => props.onSelect(item)}
                style={[
                  styles.row,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    opacity: props.loading ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.mutedText }]}>
                  {item.address ?? item.rawId}
                </Text>
              </Pressable>
            ))}

            <Pressable
              disabled={props.loading}
              onPress={() => props.onSelect()}
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  opacity: props.loading ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                {t("auth.passkeyHistory.useOther")}
              </Text>
            </Pressable>
          </View>

          <AuthButton label={t("auth.passkeyHistory.signUp")} onPress={props.onSignUp} variant="secondary" />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: 20,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  list: {
    gap: 12,
  },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 12,
  },
})

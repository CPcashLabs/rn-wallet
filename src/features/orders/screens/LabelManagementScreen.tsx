import React, { useEffect, useState } from "react"

import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { createCategoryLabel, deleteCategoryLabel, listUserCategoryLabels, type CategoryLabel } from "@/features/orders/services/ordersApi"
import { PageEmpty, PrimaryButton, SectionCard, SecondaryButton } from "@/features/transfer/components/TransferUi"
import { useToast } from "@/shared/toast/useToast"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<OrdersStackParamList, "LabelManagementScreen" | "TagsNotesEditScreen">

export function LabelManagementScreen({ navigation }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [labels, setLabels] = useState<CategoryLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")

  const loadLabels = async () => {
    try {
      const response = await listUserCategoryLabels()
      setLabels(response)
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.labels.loadFailed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLabels()
  }, [])

  const handleDelete = (label: CategoryLabel) => {
    Alert.alert(t("orders.labels.deleteTitle"), t("orders.labels.deleteBody", { name: label.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteCategoryLabel(label.id)
              setLabels(current => current.filter(item => item.id !== label.id))
            } catch {
              Alert.alert(t("common.errorTitle"), t("orders.labels.deleteFailed"))
            }
          })()
        },
      },
    ])
  }

  const handleCreate = async () => {
    const trimmed = newLabelName.trim()
    if (!trimmed) {
      showToast({ message: t("orders.labels.empty"), tone: "warning" })
      return
    }

    setSubmitting(true)

    try {
      await createCategoryLabel({ labelName: trimmed })
      setNewLabelName("")
      setDialogVisible(false)
      await loadLabels()
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.labels.createFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("orders.labels.title")}
      scroll={false}
      right={
        <Pressable onPress={() => setDialogVisible(true)} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>{t("orders.labels.add")}</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.labels.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && labels.length === 0 ? <PageEmpty title={t("orders.labels.emptyTitle")} body={t("orders.labels.emptyBody")} /> : null}

        {labels.map(label => (
          <View key={label.id} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{label.name}</Text>
            <Pressable onPress={() => handleDelete(label)}>
              <Text style={[styles.deleteText, { color: "#DC2626" }]}>{t("orders.labels.delete")}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal animationType="fade" transparent visible={dialogVisible} onRequestClose={() => setDialogVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t("orders.labels.addTitle")}</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setNewLabelName}
              placeholder={t("orders.labels.placeholder")}
              placeholderTextColor={theme.colors.mutedText}
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              value={newLabelName}
            />
            <PrimaryButton label={submitting ? t("common.loading") : t("common.confirm")} onPress={() => void handleCreate()} />
            <SecondaryButton label={t("common.cancel")} onPress={() => setDialogVisible(false)} />
          </View>
        </View>
      </Modal>
    </HomeScaffold>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
})

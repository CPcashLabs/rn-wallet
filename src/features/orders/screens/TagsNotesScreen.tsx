import React, { useEffect, useMemo, useState } from "react"

import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import {
  bindCategoryLabel,
  findOrderLabels,
  listUserCategoryLabels,
  uploadOrderNoteImage,
  type CategoryLabel,
} from "@/features/orders/services/ordersApi"
import { fileAdapter, isNativeImagePickerCancelledError } from "@/shared/native"
import { PageEmpty, PrimaryButton, SectionCard, SecondaryButton } from "@/features/transfer/components/TransferUi"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { OrdersStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<OrdersStackParamList, "TagsNotesScreen">

export function TagsNotesScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const orderSn = route.params.orderSn
  const [labels, setLabels] = useState<CategoryLabel[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const [allLabels, binding] = await Promise.all([listUserCategoryLabels(), findOrderLabels(orderSn)])
        if (!active) {
          return
        }

        setLabels(allLabels)
        setSelectedIds(binding.labels.map(item => item.id))
        setNotes(binding.notes)
        setImageUrl(binding.notesImageUrl)
      } catch {
        if (active) {
          Alert.alert(t("common.errorTitle"), t("orders.tags.loadFailed"))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [orderSn, t])

  const selectedCount = selectedIds.length
  const canAddMore = selectedCount < 3
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleLabel = (id: string) => {
    setSelectedIds(current => {
      if (current.includes(id)) {
        return current.filter(item => item !== id)
      }

      if (current.length >= 3) {
        Alert.alert(t("common.infoTitle"), t("orders.tags.limit"))
        return current
      }

      return [...current, id]
    })
  }

  const handleSelectImage = async () => {
    const capability = fileAdapter.getCapability()
    if (!capability.supported) {
      Alert.alert(t("common.infoTitle"), t("orders.tags.imageUnavailable"))
      return
    }

    try {
      const picked = await fileAdapter.pickImage()
      if (!picked.ok) {
        throw picked.error
      }

      setUploading(true)
      const uploadedUrl = await uploadOrderNoteImage(picked.data)
      if (!uploadedUrl) {
        throw new Error("missing uploaded url")
      }

      setImageUrl(uploadedUrl)
    } catch (error) {
      if (isNativeImagePickerCancelledError(error)) {
        return
      }

      Alert.alert(t("common.errorTitle"), t("orders.tags.imageUploadFailed"))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (notes.trim() !== notes && notes.trim().length === 0 && notes.length > 0) {
      Alert.alert(t("common.infoTitle"), t("orders.tags.notesRequired"))
      return
    }

    setSaving(true)

    try {
      await bindCategoryLabel({
        orderSn,
        categoryLabelIds: selectedIds,
        notes: notes.trim(),
        notesImageUrl: imageUrl || undefined,
      })
      Alert.alert(t("common.infoTitle"), t("orders.tags.saveSuccess"))
      navigation.goBack()
    } catch {
      Alert.alert(t("common.errorTitle"), t("orders.tags.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={t("orders.tags.title")}
      scroll={false}
      right={
        <Pressable onPress={() => navigation.navigate("TagsNotesEditScreen")} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>{t("orders.tags.manage")}</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <SectionCard>
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.body, { color: theme.colors.mutedText }]}>{t("orders.tags.loading")}</Text>
            </View>
          </SectionCard>
        ) : null}

        {!loading && labels.length === 0 ? <PageEmpty title={t("orders.tags.emptyTitle")} body={t("orders.tags.emptyBody")} /> : null}

        {!loading ? (
          <>
            <SectionCard>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.tags.select")}</Text>
                <Text style={[styles.sectionCount, { color: theme.colors.mutedText }]}>
                  {selectedCount}/3
                </Text>
              </View>
              <View style={styles.tagWrap}>
                {labels.map(label => {
                  const active = selectedSet.has(label.id)
                  return (
                    <Pressable
                      key={label.id}
                      onPress={() => toggleLabel(label.id)}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: active ? "#DFF7F3" : theme.colors.background,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                          opacity: !active && !canAddMore ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: active ? theme.colors.primary : theme.colors.text }]}>{label.name}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.tags.notes")}</Text>
              <TextInput
                multiline
                maxLength={100}
                onChangeText={setNotes}
                placeholder={t("orders.tags.placeholder")}
                placeholderTextColor={theme.colors.mutedText}
                style={[styles.textarea, { borderColor: theme.colors.border, color: theme.colors.text }]}
                textAlignVertical="top"
                value={notes}
              />
            </SectionCard>

            <SectionCard>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("orders.tags.imageTitle")}</Text>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.previewImage} /> : null}
              <SecondaryButton
                label={uploading ? t("common.loading") : imageUrl ? t("orders.tags.replaceImage") : t("orders.tags.addImage")}
                onPress={() => void handleSelectImage()}
              />
            </SectionCard>

            <PrimaryButton label={saving ? t("common.loading") : t("orders.tags.save")} onPress={() => void handleSave()} disabled={saving} />
          </>
        ) : null}
      </ScrollView>
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
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 12,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
  },
  textarea: {
    minHeight: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
})

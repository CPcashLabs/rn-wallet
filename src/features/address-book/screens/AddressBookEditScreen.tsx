import React, { useEffect, useMemo, useState } from "react"

import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import {
  createAddressBookEntry,
  deleteAddressBookEntry,
  getAddressBookDetail,
  type AddressBookDraft,
  type AddressBookEntry,
  updateAddressBookEntry,
} from "@/features/address-book/services/addressBookApi"
import { useAddressBookStore } from "@/features/address-book/store/useAddressBookStore"
import { HomeScaffold } from "@/features/home/components/HomeScaffold"
import { ApiError } from "@/shared/errors"
import { useAppTheme } from "@/shared/theme/useAppTheme"

import type { AddressBookStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AddressBookStackParamList, "AddressBookEditScreen">
type AddressBookChainType = AddressBookDraft["chainType"]

const MAX_NAME_LENGTH = 20

export function AddressBookEditScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const refreshEntries = useAddressBookStore(state => state.refreshEntries)
  const upsertEntry = useAddressBookStore(state => state.upsertEntry)
  const removeEntry = useAddressBookStore(state => state.removeEntry)
  const [name, setName] = useState("")
  const [walletAddress, setWalletAddress] = useState(route.params?.initialAddress ?? "")
  const [chainType, setChainType] = useState<AddressBookChainType | null>(route.params?.chainType ?? null)
  const [loading, setLoading] = useState(Boolean(route.params?.id))
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addressError, setAddressError] = useState("")

  const isEdit = Boolean(route.params?.id)

  useEffect(() => {
    const normalized = walletAddress.trim()
    if (!normalized) {
      setChainType(route.params?.chainType ?? null)
      setAddressError("")
      return
    }

    const nextChainType = detectAddressChainType(normalized)
    if (!nextChainType) {
      setChainType(null)
      setAddressError(t("home.addressBook.invalidAddress"))
      return
    }

    setChainType(nextChainType)
    setAddressError("")
  }, [route.params?.chainType, t, walletAddress])

  useEffect(() => {
    const addressBookId = route.params?.id
    if (!addressBookId) {
      return
    }

    let mounted = true

    void (async () => {
      setLoading(true)
      try {
        const detail = await getAddressBookDetail(addressBookId)
        if (!mounted) {
          return
        }

        setFormState(detail, setName, setWalletAddress, setChainType)
      } catch {
        if (!mounted) {
          return
        }

        Alert.alert(t("common.errorTitle"), t("home.addressBook.loadDetailFailed"), [
          {
            text: t("common.confirm"),
            onPress: () => navigation.goBack(),
          },
        ])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [navigation, route.params?.id, t])

  const saveDisabled = useMemo(() => {
    return submitting || deleting || !name.trim() || !walletAddress.trim() || !chainType || Boolean(addressError)
  }, [addressError, chainType, deleting, name, submitting, walletAddress])

  const networkDescription = chainType ? t(`home.addressBook.chain.${chainType}`) : t("home.addressBook.networkPending")

  const save = async () => {
    if (!chainType) {
      Alert.alert(t("common.errorTitle"), t("home.addressBook.invalidAddress"))
      return
    }

    const draft: AddressBookDraft = {
      name: name.trim(),
      walletAddress: walletAddress.trim(),
      chainType,
    }

    setSubmitting(true)

    try {
      if (route.params?.id) {
        await updateAddressBookEntry(route.params.id, draft)
      } else {
        await createAddressBookEntry(draft)
      }

      await refreshEntries()

      const latestEntry = useAddressBookStore.getState().findByAddress(draft.walletAddress)
      if (latestEntry) {
        upsertEntry(latestEntry)
      }

      Alert.alert(
        t("common.infoTitle"),
        route.params?.id ? t("home.addressBook.updateSuccess") : t("home.addressBook.createSuccess"),
        [
          {
            text: t("common.confirm"),
            onPress: () => navigation.goBack(),
          },
        ],
      )
    } catch (error) {
      Alert.alert(t("common.errorTitle"), resolveAddressBookSaveError(error, t))
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!route.params?.id) {
      return
    }

    setDeleting(true)

    try {
      await deleteAddressBookEntry(route.params.id)
      removeEntry(route.params.id)
      Alert.alert(t("common.infoTitle"), t("home.addressBook.deleteSuccess"), [
        {
          text: t("common.confirm"),
          onPress: () => navigation.goBack(),
        },
      ])
    } catch {
      Alert.alert(t("common.errorTitle"), t("home.addressBook.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={isEdit ? t("home.addressBook.editTitle") : t("home.addressBook.addTitle")}
      right={
        isEdit ? (
          <Pressable
            disabled={deleting || submitting}
            onPress={() =>
              Alert.alert(t("home.addressBook.deleteTitle"), t("home.addressBook.deleteBody"), [
                {
                  text: t("common.cancel"),
                  style: "cancel",
                },
                {
                  text: t("common.confirm"),
                  style: "destructive",
                  onPress: () => {
                    void remove()
                  },
                },
              ])
            }
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: "#DC2626" }]}>
              {deleting ? t("common.loading") : t("home.addressBook.delete")}
            </Text>
          </Pressable>
        ) : null
      }
    >
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("home.addressBook.nameLabel")}</Text>
        <TextInput
          maxLength={MAX_NAME_LENGTH}
          onChangeText={setName}
          placeholder={t("home.addressBook.namePlaceholder")}
          placeholderTextColor={theme.colors.mutedText}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          value={name}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("home.addressBook.addressLabel")}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          multiline
          onChangeText={setWalletAddress}
          placeholder={t("home.addressBook.addressPlaceholder")}
          placeholderTextColor={theme.colors.mutedText}
          style={[
            styles.input,
            styles.addressInput,
            {
              color: theme.colors.text,
              borderColor: addressError ? "#DC2626" : theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
          value={walletAddress}
        />
        <Text style={[styles.helperText, { color: addressError ? "#DC2626" : theme.colors.mutedText }]}>
          {addressError || t("home.addressBook.addressHelper")}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("home.addressBook.networkLabel")}</Text>
        <View style={[styles.networkBadge, { backgroundColor: chainType === "TRON" ? "#FFF1E9" : "#EBF4FF" }]}>
          <Text style={[styles.networkBadgeText, { color: chainType === "TRON" ? "#E37318" : "#1D4ED8" }]}>
            {networkDescription}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={saveDisabled}
        onPress={() => {
          void save()
        }}
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: saveDisabled ? 0.65 : 1 }]}
      >
        <Text style={styles.primaryButtonText}>
          {submitting || loading ? t("common.loading") : t("home.addressBook.save")}
        </Text>
      </Pressable>
    </HomeScaffold>
  )
}

function setFormState(
  detail: AddressBookEntry,
  setName: (value: string) => void,
  setWalletAddress: (value: string) => void,
  setChainType: (value: AddressBookChainType | null) => void,
) {
  setName(detail.name)
  setWalletAddress(detail.walletAddress)
  setChainType(detail.chainType)
}

function detectAddressChainType(address: string): AddressBookChainType | null {
  const normalized = address.trim()

  if (/^(0x|0X)?[a-fA-F0-9]{40}$/.test(normalized)) {
    return "EVM"
  }

  if (/^T[a-zA-Z0-9]{33}$/.test(normalized)) {
    return "TRON"
  }

  return null
}

function resolveAddressBookSaveError(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError) {
    if (String(error.code) === "40002") {
      return t("home.addressBook.addressExists")
    }

    if (String(error.code) === "40003") {
      return t("home.addressBook.nameExists")
    }
  }

  return t("home.addressBook.saveFailed")
}

const styles = StyleSheet.create({
  headerButton: {
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  addressInput: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  networkBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  networkBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
})

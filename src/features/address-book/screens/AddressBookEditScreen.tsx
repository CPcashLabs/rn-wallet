import React, { useCallback, useEffect, useRef } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useController, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { type AddressBookDraft } from "@/features/address-book/services/addressBookApi"
import { useAddressBookDetailQuery, useDeleteAddressBookEntryMutation, useSaveAddressBookEntryMutation } from "@/shared/address-book/addressBookQueries"
import { useAddressBookStore } from "@/features/address-book/store/useAddressBookStore"
import { HeaderTextAction, HomeScaffold } from "@/features/home/components/HomeScaffold"
import { ApiError, NativeCapabilityUnavailableError } from "@/shared/errors"
import { errorCodeOf, resolveErrorMessage } from "@/shared/errors/presentation"
import { scannerAdapter } from "@/shared/native"
import { useAppTheme } from "@/shared/theme/useAppTheme"
import { AppButton } from "@/shared/ui/AppButton"
import { AppCard } from "@/shared/ui/AppCard"
import { AppTextField } from "@/shared/ui/AppTextField"
import { AppGlyph } from "@/shared/ui/AppGlyph"

import type { AddressBookStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AddressBookStackParamList, "AddressBookEditScreen">
type AddressBookChainType = AddressBookDraft["chainType"]

const MAX_NAME_LENGTH = 20

function isCancelledNativeAction(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = Reflect.get(error, "code")
  if (typeof code === "string" && code.toLowerCase().includes("cancel")) {
    return true
  }

  return error.name.toLowerCase().includes("cancel")
}

function resolveScanErrorMessage(error: Error, t: (key: string) => string) {
  return resolveErrorMessage(t, error, {
    fallbackKey: "transfer.address.scanFailed",
    codeMap: {
      permission_denied: "transfer.address.scanPermissionDenied",
      multiple_codes: "transfer.address.scanMultiple",
      image_parse_failed: "transfer.address.scanImageParseFailed",
    },
    preferApiMessage: false,
    preferErrorMessage: false,
    customResolver: currentError => {
      const code = errorCodeOf(currentError)
      if (code === "no_code") {
        return t("transfer.address.scanNoCode")
      }

      return undefined
    },
  })
}

const addressBookSchema = z.object({
  name: z.string().min(1),
  walletAddress: z.string().min(1).refine(
    addr => detectAddressChainType(addr.trim()) !== null,
    { message: "home.addressBook.invalidAddress" },
  ),
})
type AddressBookFormValues = z.infer<typeof addressBookSchema>

export function AddressBookEditScreen({ navigation, route }: Props) {
  const theme = useAppTheme()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const detailQuery = useAddressBookDetailQuery(route.params?.id)
  const saveMutation = useSaveAddressBookEntryMutation(queryClient)
  const deleteMutation = useDeleteAddressBookEntryMutation(queryClient)
  const presentedDetailErrorAtRef = useRef(0)

  const { control, handleSubmit, setValue, formState: { isValid } } = useForm<AddressBookFormValues>({
    resolver: zodResolver(addressBookSchema),
    defaultValues: { name: "", walletAddress: route.params?.initialAddress ?? "" },
    mode: "onChange",
  })

  const { field: nameField } = useController({ control, name: "name" })
  const { field: addressField, fieldState: addressFieldState } = useController({ control, name: "walletAddress" })
  const walletAddress = useWatch({ control, name: "walletAddress" })

  const chainType: AddressBookChainType | null = detectAddressChainType(walletAddress.trim()) ?? (route.params?.chainType ?? null)
  const addressError = addressFieldState.error ? t(addressFieldState.error.message ?? "home.addressBook.invalidAddress") : ""

  const isEdit = Boolean(route.params?.id)
  const loading = isEdit && detailQuery.isLoading && !detailQuery.data
  const submitting = saveMutation.isPending
  const deleting = deleteMutation.isPending
  const saveDisabled = !isValid || submitting || deleting || loading

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }

    setValue("name", detailQuery.data.name)
    setValue("walletAddress", detailQuery.data.walletAddress, { shouldValidate: true })
  }, [detailQuery.data, setValue])

  useEffect(() => {
    if (!isEdit || !detailQuery.error || detailQuery.errorUpdatedAt === presentedDetailErrorAtRef.current) {
      return
    }

    presentedDetailErrorAtRef.current = detailQuery.errorUpdatedAt
    Alert.alert(t("common.errorTitle"), t("home.addressBook.loadDetailFailed"), [
      {
        text: t("common.confirm"),
        onPress: () => navigation.goBack(),
      },
    ])
  }, [detailQuery.error, detailQuery.errorUpdatedAt, isEdit, navigation, t])

  const networkDescription = chainType ? t(`home.addressBook.chain.${chainType}`) : t("home.addressBook.networkPending")

  const handleScan = useCallback(async () => {
    const capability = scannerAdapter.getCapability("camera")
    if (!capability.supported) {
      Alert.alert(t("common.infoTitle"), t("transfer.address.scanUnavailable"))
      return
    }

    const result = await scannerAdapter.scan()

    if (!result.ok) {
      if (isCancelledNativeAction(result.error)) {
        return
      }

      if (result.error instanceof NativeCapabilityUnavailableError) {
        Alert.alert(t("common.infoTitle"), t("transfer.address.scanUnavailable"))
        return
      }

      Alert.alert(t("common.errorTitle"), resolveScanErrorMessage(result.error, t))
      return
    }

    setValue("walletAddress", result.data.value, { shouldValidate: true })
  }, [setValue, t])

  const save = handleSubmit(async (values) => {
    if (!chainType) {
      Alert.alert(t("common.errorTitle"), t("home.addressBook.invalidAddress"))
      return
    }

    const draft: AddressBookDraft = {
      name: values.name.trim(),
      walletAddress: values.walletAddress.trim(),
      chainType,
    }

    try {
      const result = await saveMutation.mutateAsync({
        id: route.params?.id,
        draft,
      })
      const selectedEntry = useAddressBookStore.getState().selectedEntry
      if (selectedEntry?.id === route.params?.id && result.entry) {
        useAddressBookStore.getState().setSelectedEntry(result.entry)
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
    }
  })

  const remove = async () => {
    if (!route.params?.id) {
      return
    }

    try {
      await deleteMutation.mutateAsync(route.params.id)
      const selectedEntry = useAddressBookStore.getState().selectedEntry
      if (selectedEntry?.id === route.params.id) {
        useAddressBookStore.getState().setSelectedEntry(null)
      }
      Alert.alert(t("common.infoTitle"), t("home.addressBook.deleteSuccess"), [
        {
          text: t("common.confirm"),
          onPress: () => navigation.goBack(),
        },
      ])
    } catch {
      Alert.alert(t("common.errorTitle"), t("home.addressBook.deleteFailed"))
    }
  }

  return (
    <HomeScaffold
      canGoBack
      onBack={navigation.goBack}
      title={isEdit ? t("home.addressBook.editTitle") : t("home.addressBook.addTitle")}
      right={
        isEdit ? (
          <HeaderTextAction
            disabled={deleting || submitting}
            label={deleting ? t("common.loading") : t("home.addressBook.delete")}
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
            tone="danger"
          />
        ) : null
      }
    >
      <AppCard>
        <AppTextField
          backgroundTone="background"
          label={t("home.addressBook.nameLabel")}
          maxLength={MAX_NAME_LENGTH}
          onChangeText={nameField.onChange}
          placeholder={t("home.addressBook.namePlaceholder")}
          value={nameField.value}
        />
      </AppCard>

      <AppCard>
        <AppTextField
          autoCapitalize="none"
          autoCorrect={false}
          backgroundTone="background"
          editable={!loading}
          error={addressError || undefined}
          helperText={t("home.addressBook.addressHelper")}
          label={t("home.addressBook.addressLabel")}
          multiline
          onChangeText={v => addressField.onChange(v)}
          placeholder={t("home.addressBook.addressPlaceholder")}
          rightSlot={(
            <Pressable
              disabled={loading || submitting || deleting}
              hitSlop={8}
              onPress={() => {
                void handleScan()
              }}
              style={({ pressed }) => [
                styles.scanButton,
                {
                  backgroundColor: theme.colors.primarySoft ?? `${theme.colors.primary}14`,
                  opacity: loading || submitting || deleting ? 0.5 : pressed ? 0.78 : 1,
                },
              ]}
            >
              <AppGlyph backgroundColor="transparent" name="scan" size={18} tintColor={theme.colors.primary} />
            </Pressable>
          )}
          value={addressField.value}
        />
      </AppCard>

      <AppCard>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("home.addressBook.networkLabel")}</Text>
        <View style={[styles.networkBadge, { backgroundColor: chainType === "TRON" ? theme.colors.warningSoft : theme.colors.infoSoft }]}>
          <Text style={[styles.networkBadgeText, { color: chainType === "TRON" ? theme.colors.warning : theme.colors.info }]}>
            {networkDescription}
          </Text>
        </View>
      </AppCard>

      <AppButton
        disabled={saveDisabled}
        label={submitting || loading ? t("common.loading") : t("home.addressBook.save")}
        onPress={save}
      />
    </HomeScaffold>
  )
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
  label: {
    fontSize: 14,
    fontWeight: "700",
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
  scanButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
})

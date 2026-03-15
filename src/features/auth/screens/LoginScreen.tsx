import React, { useCallback } from "react"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { EntryScreen } from "@/features/auth/entry/EntryScreen"
import type { AuthStackParamList } from "@/app/navigation/types"

type Props = NativeStackScreenProps<AuthStackParamList, "LoginScreen">

export function LoginScreen({ navigation, route }: Props) {
  const inviteCode = route.params?.inviteCode

  const handleCreateWallet = useCallback(() => {
    navigation.navigate("CreateMnemonicScreen", { inviteCode })
  }, [inviteCode, navigation])

  const handleImportWallet = useCallback(() => {
    navigation.navigate("ImportWalletLoginScreen", { inviteCode })
  }, [inviteCode, navigation])

  const handleWatchMode = useCallback(() => {
    navigation.navigate("PasswordLoginScreen", { inviteCode })
  }, [inviteCode, navigation])

  return (
    <EntryScreen
      onCreateWallet={handleCreateWallet}
      onImportWallet={handleImportWallet}
      onWatchMode={handleWatchMode}
    />
  )
}

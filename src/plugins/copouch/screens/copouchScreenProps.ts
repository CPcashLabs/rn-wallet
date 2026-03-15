import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { CopouchStackParamList } from "@/app/navigation/types"

export type CopouchStackScreenProps<T extends keyof CopouchStackParamList> = NativeStackScreenProps<CopouchStackParamList, T>

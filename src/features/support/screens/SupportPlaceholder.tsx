import React from "react"

import { useRoute } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"

import type { SupportStackParamList } from "@/app/navigation/types"
import { PlaceholderScreen } from "@/shared/ui/PlaceholderScreen"

type Route = RouteProp<SupportStackParamList, "SupportPlaceholder">

export function SupportPlaceholder() {
  const route = useRoute<Route>()
  const reason = route.params?.reason ?? "generic_support"

  return (
    <PlaceholderScreen
      title="Support Placeholder"
      description={`WP-12 will replace this screen. Current reason: ${reason}`}
    />
  )
}


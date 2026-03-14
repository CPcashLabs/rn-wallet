import React, { createContext, useContext, type PropsWithChildren } from "react"

import type { PluginContext } from "@/shared/plugins/types"

const PluginRuntimeContext = createContext<PluginContext | null>(null)

export function PluginRuntimeProvider({ children, context }: PropsWithChildren<{ context: PluginContext }>) {
  return <PluginRuntimeContext.Provider value={context}>{children}</PluginRuntimeContext.Provider>
}

export function usePluginRuntime() {
  return useContext(PluginRuntimeContext)
}

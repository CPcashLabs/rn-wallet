import React, { type PropsWithChildren } from "react"

import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { ErrorBoundaryProvider } from "@/app/providers/ErrorBoundaryProvider"
import { I18nProvider } from "@/app/providers/I18nProvider"
import { NavigationProvider } from "@/app/providers/NavigationProvider"
import { QueryProvider } from "@/app/providers/QueryProvider"
import { SocketProvider } from "@/app/providers/SocketProvider"
import { ThemeProvider } from "@/app/providers/ThemeProvider"
import { ToastProvider } from "@/shared/toast/ToastProvider"

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundaryProvider>
          <I18nProvider>
            <SocketProvider>
              <QueryProvider>
                <ThemeProvider>
                  <ToastProvider>
                    <NavigationProvider>{children}</NavigationProvider>
                  </ToastProvider>
                </ThemeProvider>
              </QueryProvider>
            </SocketProvider>
          </I18nProvider>
        </ErrorBoundaryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

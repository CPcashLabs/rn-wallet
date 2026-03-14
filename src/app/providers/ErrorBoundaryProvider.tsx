import React, { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react"

import { i18n } from "@/shared/i18n"
import { PlaceholderScreen } from "@/shared/ui/PlaceholderScreen"

type State = {
  hasError: boolean
}

class Boundary extends Component<PropsWithChildren, State> {
  state: State = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <PlaceholderScreen
          title={i18n.t("common.errors.unexpectedTitle")}
          description={i18n.t("common.errors.unexpectedBody")}
        />
      )
    }

    return this.props.children
  }
}

export function ErrorBoundaryProvider({ children }: PropsWithChildren) {
  return <Boundary>{children}</Boundary>
}

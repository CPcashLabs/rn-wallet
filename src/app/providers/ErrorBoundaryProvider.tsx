import React, { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react"

import { useTranslation } from "react-i18next"

import { PlaceholderScreen } from "@/shared/ui/PlaceholderScreen"

type State = {
  hasError: boolean
}

type BoundaryProps = PropsWithChildren<{
  title: string
  description: string
}>

class Boundary extends Component<BoundaryProps, State> {
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
      return <PlaceholderScreen title={this.props.title} description={this.props.description} />
    }

    return this.props.children
  }
}

export function ErrorBoundaryProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation()

  return (
    <Boundary
      description={t("common.errors.unexpectedBody")}
      title={t("common.errors.unexpectedTitle")}
    >
      {children}
    </Boundary>
  )
}

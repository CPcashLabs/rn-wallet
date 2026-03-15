import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react"

type Props = PropsWithChildren<{
  onError: (error: Error) => void
}>

type State = {
  hasError: boolean
}

export class PluginErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PluginErrorBoundary]", error, info)
    this.props.onError(error instanceof Error ? error : new Error(String(error)))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

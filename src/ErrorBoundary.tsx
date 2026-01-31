import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            minHeight: '100vh',
            background: '#1a1a1a',
            color: '#e8e8e8',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
          <pre style={{ fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ fontSize: 11, opacity: 0.8, marginTop: 12 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { APP_RELEASE } from './version'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('intelliCARE Person in the Rain Activity could not render', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="startup-fallback" role="alert">
        <p className="eyebrow">intelliCARE · Person in the Rain Activity · {APP_RELEASE}</p>
        <h1>We couldn’t open the studio.</h1>
        <p>Your drawing has not been uploaded. Try reloading. If this keeps happening, share the release number above and the browser’s console error.</p>
        <button className="primary-button" onClick={() => window.location.reload()}>Reload the app</button>
      </main>
    )
  }
}

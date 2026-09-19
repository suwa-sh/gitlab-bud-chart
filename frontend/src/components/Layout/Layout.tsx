import { ReactNode } from 'react'
import { Navigation } from './Navigation'
import { ErrorBoundary } from './ErrorBoundary'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}

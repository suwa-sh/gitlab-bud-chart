import { ReactNode } from 'react'
import { Navigation } from './Navigation'
import { ErrorBoundary } from './ErrorBoundary'
import { LoadingSpinner } from '../Common/LoadingSpinner'
import { useApp } from '../../contexts/AppContext'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const { state } = useApp()
  
  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <ErrorBoundary>
          {state.loading && <LoadingSpinner />}
          {children}
        </ErrorBoundary>
      </main>
    </div>
  )
}
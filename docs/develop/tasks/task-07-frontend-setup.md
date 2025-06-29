# Task 07: React Frontend基盤構築

## 概要
React基盤・ルーティング・状態管理設定を行い、Frontend開発基盤を完成させる。

## 目的
- React Router設定
- 状態管理（Context API）設定
- 基本コンポーネント構造作成
- TypeScript型定義整備

## 前提条件
- Task 06完了（Backend API完成）

## 作業手順

### 1. 状態管理設定

**frontend/src/contexts/AppContext.tsx**:
```tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { Issue } from '../types/api'

interface AppState {
  issues: Issue[]
  loading: boolean
  error: string | null
  filters: {
    milestone?: string
    assignee?: string
    service?: string
    kanban_status?: string
  }
  gitlabConfig: {
    url: string
    isConnected: boolean
  }
}

type AppAction = 
  | { type: 'SET_ISSUES'; payload: Issue[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'SET_GITLAB_CONFIG'; payload: Partial<AppState['gitlabConfig']> }

const initialState: AppState = {
  issues: [],
  loading: false,
  error: null,
  filters: {},
  gitlabConfig: {
    url: '',
    isConnected: false
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
}>({ state: initialState, dispatch: () => null })

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ISSUES':
      return { ...state, issues: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'SET_GITLAB_CONFIG':
      return { ...state, gitlabConfig: { ...state.gitlabConfig, ...action.payload } }
    default:
      return state
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
```

### 2. ルーティング設定

**frontend/src/App.tsx** 更新:
```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PBLViewer } from './components/PBLViewer/PBLViewer'
import './App.css'

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pbl-viewer" element={<PBLViewer />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App
```

### 3. 共通コンポーネント作成

**frontend/src/components/Layout/Layout.tsx**:
```tsx
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
```

### 4. カスタムフック作成

**frontend/src/hooks/useIssues.ts**:
```typescript
import { useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'
import { Issue } from '../types/api'

export const useIssues = () => {
  const { state, dispatch } = useApp()
  
  const fetchIssues = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      const response = await issuesApi.getIssues(filters)
      dispatch({ type: 'SET_ISSUES', payload: response.issues })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch])
  
  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [dispatch])
  
  return {
    issues: state.issues,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    fetchIssues,
    setFilters
  }
}
```

## 成果物
1. **状態管理基盤** (Context API + useReducer)
2. **ルーティング設定** (React Router)
3. **共通コンポーネント** (Layout, Navigation, ErrorBoundary)
4. **カスタムフック** (useIssues, useGitLab)
5. **TypeScript型定義** 完備

## 検証項目
- [ ] ルーティング正常動作
- [ ] 状態管理適切実装
- [ ] TypeScript型安全性確保
- [ ] コンポーネント構造適切

## 作業時間見積もり: 4-6時間
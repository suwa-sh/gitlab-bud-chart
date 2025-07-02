import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { format, addMonths, endOfMonth } from 'date-fns'
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
    state?: string
    search?: string
    min_point?: number
    max_point?: number
    quarter?: string
    created_after?: string
    created_before?: string
    completed_after?: string
  }
  chartPeriod: {
    start: string
    end: string
  }
  gitlabConfig: {
    url: string
    isConnected: boolean
    token?: string
    projectId?: string
    projectName?: string
    projectNamespace?: string
    apiVersion?: string
    httpProxy?: string
    httpsProxy?: string
    noProxy?: string
  }
  sessionId?: string
}

type AppAction = 
  | { type: 'SET_ISSUES'; payload: Issue[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'SET_CHART_PERIOD'; payload: { start: string; end: string } }
  | { type: 'SET_GITLAB_CONFIG'; payload: Partial<AppState['gitlabConfig']> }
  | { type: 'SET_METADATA'; payload: any }
  | { type: 'SET_SESSION_ID'; payload: string | undefined }

// 現在の四半期の開始日と終了日を計算する関数
const getCurrentQuarterPeriod = (): { start: string; end: string } => {
  const today = new Date()
  const quarterMonth = Math.floor(today.getMonth() / 3) * 3
  const start = new Date(today.getFullYear(), quarterMonth, 1)
  const end = endOfMonth(addMonths(start, 2))
  
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  }
}

// LocalStorageからGitLab設定を読み込む関数
const loadGitLabConfigFromStorage = (): AppState['gitlabConfig'] => {
  try {
    const stored = localStorage.getItem('gitlab-config')
    if (stored) {
      const config = JSON.parse(stored)
      return {
        url: config.url || '',
        isConnected: config.isConnected || false,
        token: config.token,
        projectId: config.projectId,
        projectName: config.projectName,
        projectNamespace: config.projectNamespace,
        apiVersion: config.apiVersion,
        httpProxy: config.httpProxy,
        httpsProxy: config.httpsProxy,
        noProxy: config.noProxy
      }
    }
  } catch (error) {
    console.warn('Failed to load GitLab config from localStorage:', error)
  }
  return {
    url: '',
    isConnected: false,
    token: undefined,
    projectId: undefined,
    projectName: undefined,
    projectNamespace: undefined,
    apiVersion: undefined,
    httpProxy: undefined,
    httpsProxy: undefined,
    noProxy: undefined
  }
}

// LocalStorageにGitLab設定を保存する関数
const saveGitLabConfigToStorage = (config: AppState['gitlabConfig']) => {
  try {
    localStorage.setItem('gitlab-config', JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to save GitLab config to localStorage:', error)
  }
}

// LocalStorageからissuesデータを読み込む関数
const loadIssuesFromStorage = (sessionId?: string): Issue[] => {
  if (!sessionId) return []
  
  try {
    const stored = localStorage.getItem(`issues-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.issues || []
      }
    }
  } catch (error) {
    console.warn('Failed to load issues from localStorage:', error)
  }
  return []
}

// LocalStorageにissuesデータを保存する関数
const saveIssuesToStorage = (issues: Issue[], sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      issues,
      timestamp: Date.now()
    }
    localStorage.setItem(`issues-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save issues to localStorage:', error)
  }
}

// LocalStorageからfiltersデータを読み込む関数
const loadFiltersFromStorage = (sessionId?: string): AppState['filters'] => {
  if (!sessionId) return {}
  
  try {
    const stored = localStorage.getItem(`filters-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.filters || {}
      }
    }
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error)
  }
  return {}
}

// LocalStorageにfiltersデータを保存する関数
const saveFiltersToStorage = (filters: AppState['filters'], sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      filters,
      timestamp: Date.now()
    }
    localStorage.setItem(`filters-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error)
  }
}

// 古いセッションのキャッシュをクリーンアップする関数
const cleanupOldCache = (currentSessionId?: string) => {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('issues-') || key.startsWith('filters-'))) {
        if (!currentSessionId || !key.endsWith(currentSessionId)) {
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.warn('Failed to cleanup old cache:', error)
  }
}

const createInitialState = (): AppState => {
  const sessionId = localStorage.getItem('gitlab-dashboard-session-id') || undefined
  return {
    issues: loadIssuesFromStorage(sessionId),
    loading: false,
    error: null,
    filters: loadFiltersFromStorage(sessionId),
    chartPeriod: getCurrentQuarterPeriod(),
    gitlabConfig: loadGitLabConfigFromStorage(),
    sessionId: sessionId
  }
}

const initialState: AppState = createInitialState()

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
    case 'SET_CHART_PERIOD':
      return { ...state, chartPeriod: action.payload }
    case 'SET_GITLAB_CONFIG':
      return { ...state, gitlabConfig: { ...state.gitlabConfig, ...action.payload } }
    case 'SET_METADATA':
      // Handle metadata if we need to store it in state later
      return state
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload }
    default:
      return state
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
  // GitLab設定が変更されたときにlocalStorageに保存
  useEffect(() => {
    saveGitLabConfigToStorage(state.gitlabConfig)
  }, [state.gitlabConfig])
  
  // issuesが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (state.issues.length > 0) {
      saveIssuesToStorage(state.issues, state.sessionId)
    }
  }, [state.issues, state.sessionId])
  
  // filtersが変更されたときにlocalStorageに保存
  useEffect(() => {
    saveFiltersToStorage(state.filters, state.sessionId)
  }, [state.filters, state.sessionId])
  
  // sessionIdが変更されたときに古いキャッシュをクリーンアップ
  useEffect(() => {
    if (state.sessionId) {
      cleanupOldCache(state.sessionId)
    }
  }, [state.sessionId])
  
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
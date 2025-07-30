import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { format } from 'date-fns'
import { Issue } from '../types/api'
import { getCurrentFiscalQuarter, fiscalQuarterToDateRange } from '../utils/quarterUtils'

interface IssueFilters {
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
  completed_before?: string
  is_epic?: string
}

interface AppState {
  // Dashboard用の状態
  dashboardIssues: Issue[]
  dashboardLoading: boolean
  dashboardError: string | null
  dashboardFilters: IssueFilters
  dashboardCacheTimestamp: Date | null
  dashboardWarnings: any[] | null
  
  // PBL-Viewer用の状態
  pblViewerIssues: Issue[]
  pblViewerLoading: boolean
  pblViewerError: string | null
  pblViewerFilters: IssueFilters
  pblViewerCacheTimestamp: Date | null
  
  // 共通状態
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
  
  // 後方互換性のため残す（廃止予定）
  issues: Issue[]
  loading: boolean
  error: string | null
  filters: IssueFilters
}

type AppAction = 
  // Dashboard用のアクション
  | { type: 'SET_DASHBOARD_ISSUES'; payload: Issue[] }
  | { type: 'SET_DASHBOARD_LOADING'; payload: boolean }
  | { type: 'SET_DASHBOARD_ERROR'; payload: string | null }
  | { type: 'SET_DASHBOARD_FILTERS'; payload: Partial<IssueFilters> }
  | { type: 'SET_DASHBOARD_CACHE_TIMESTAMP'; payload: Date | null }
  | { type: 'SET_DASHBOARD_WARNINGS'; payload: any[] | null }
  
  // PBL-Viewer用のアクション
  | { type: 'SET_PBL_VIEWER_ISSUES'; payload: Issue[] }
  | { type: 'SET_PBL_VIEWER_LOADING'; payload: boolean }
  | { type: 'SET_PBL_VIEWER_ERROR'; payload: string | null }
  | { type: 'SET_PBL_VIEWER_FILTERS'; payload: Partial<IssueFilters> }
  | { type: 'SET_PBL_VIEWER_CACHE_TIMESTAMP'; payload: Date | null }
  
  // 共通アクション
  | { type: 'SET_CHART_PERIOD'; payload: { start: string; end: string } }
  | { type: 'SET_GITLAB_CONFIG'; payload: Partial<AppState['gitlabConfig']> }
  | { type: 'SET_METADATA'; payload: any }
  | { type: 'SET_SESSION_ID'; payload: string | undefined }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'RESET_SESSION' }
  
  // 後方互換性のため残す（廃止予定）
  | { type: 'SET_ISSUES'; payload: Issue[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<IssueFilters> }

// デフォルトの期間を現在の四半期から算出
const getDefaultPeriod = (): { start: string; end: string } => {
  const currentQuarter = getCurrentFiscalQuarter() // 例: @FY25Q2
  const dateRange = fiscalQuarterToDateRange(currentQuarter) // { start: Date, end: Date }
  
  return {
    start: format(dateRange.start, 'yyyy-MM-dd'),
    end: format(dateRange.end, 'yyyy-MM-dd')
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

// LocalStorageからissuesデータを読み込む関数（Dashboard用）
const loadDashboardIssuesFromStorage = (sessionId?: string): Issue[] => {
  if (!sessionId) return []
  
  try {
    const stored = localStorage.getItem(`dashboard-issues-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.issues || []
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard issues from localStorage:', error)
  }
  return []
}

// LocalStorageからDashboardキャッシュタイムスタンプを読み込む関数
const loadDashboardCacheTimestamp = (sessionId?: string): Date | null => {
  if (!sessionId) return null
  
  try {
    const stored = localStorage.getItem(`dashboard-issues-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return new Date(data.timestamp)
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard cache timestamp:', error)
  }
  return null
}

// LocalStorageからissuesデータを読み込む関数（PBL-Viewer用）
const loadPBLViewerIssuesFromStorage = (sessionId?: string): Issue[] => {
  if (!sessionId) return []
  
  try {
    const stored = localStorage.getItem(`pbl-viewer-issues-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.issues || []
      }
    }
  } catch (error) {
    console.warn('Failed to load pbl-viewer issues from localStorage:', error)
  }
  return []
}

// LocalStorageからPBL-Viewerキャッシュタイムスタンプを読み込む関数
const loadPBLViewerCacheTimestamp = (sessionId?: string): Date | null => {
  if (!sessionId) return null
  
  try {
    const stored = localStorage.getItem(`pbl-viewer-issues-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return new Date(data.timestamp)
      }
    }
  } catch (error) {
    console.warn('Failed to load pbl-viewer cache timestamp:', error)
  }
  return null
}

// LocalStorageからissuesデータを読み込む関数（後方互換性）
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

// LocalStorageにissuesデータを保存する関数（Dashboard用）
const saveDashboardIssuesToStorage = (issues: Issue[], sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      issues,
      timestamp: Date.now()
    }
    localStorage.setItem(`dashboard-issues-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save dashboard issues to localStorage:', error)
  }
}

// LocalStorageにissuesデータを保存する関数（PBL-Viewer用）
const savePBLViewerIssuesToStorage = (issues: Issue[], sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      issues,
      timestamp: Date.now()
    }
    localStorage.setItem(`pbl-viewer-issues-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save pbl-viewer issues to localStorage:', error)
  }
}

// LocalStorageにissuesデータを保存する関数（後方互換性）
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

// LocalStorageからfiltersデータを読み込む関数（Dashboard用）
const loadDashboardFiltersFromStorage = (sessionId?: string): IssueFilters => {
  if (!sessionId) return {}
  
  try {
    const stored = localStorage.getItem(`dashboard-filters-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.filters || {}
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard filters from localStorage:', error)
  }
  return {}
}

// LocalStorageからfiltersデータを読み込む関数（PBL-Viewer用）
const loadPBLViewerFiltersFromStorage = (sessionId?: string): IssueFilters => {
  if (!sessionId) return {}
  
  try {
    const stored = localStorage.getItem(`pbl-viewer-filters-${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      // 1時間以内のキャッシュのみ有効
      if (data.timestamp && Date.now() - data.timestamp < 3600000) {
        return data.filters || {}
      }
    }
  } catch (error) {
    console.warn('Failed to load pbl-viewer filters from localStorage:', error)
  }
  return {}
}

// LocalStorageからfiltersデータを読み込む関数（後方互換性）
const loadFiltersFromStorage = (sessionId?: string): IssueFilters => {
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

// LocalStorageにfiltersデータを保存する関数（Dashboard用）
const saveDashboardFiltersToStorage = (filters: IssueFilters, sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      filters,
      timestamp: Date.now()
    }
    localStorage.setItem(`dashboard-filters-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save dashboard filters to localStorage:', error)
  }
}

// LocalStorageにfiltersデータを保存する関数（PBL-Viewer用）
const savePBLViewerFiltersToStorage = (filters: IssueFilters, sessionId?: string) => {
  if (!sessionId) return
  
  try {
    const data = {
      filters,
      timestamp: Date.now()
    }
    localStorage.setItem(`pbl-viewer-filters-${sessionId}`, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save pbl-viewer filters to localStorage:', error)
  }
}

// LocalStorageにfiltersデータを保存する関数（後方互換性）
const saveFiltersToStorage = (filters: IssueFilters, sessionId?: string) => {
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

// 古いキャッシュから新しい分離キャッシュへのマイグレーション
const migrateOldCacheToNewFormat = (sessionId?: string) => {
  if (!sessionId) return
  
  try {
    // 古い単一キャッシュからデータを読み込み
    const oldIssuesData = localStorage.getItem(`issues-${sessionId}`)
    const oldFiltersData = localStorage.getItem(`filters-${sessionId}`)
    
    // Dashboard用にマイグレーション（期間フィルタありのデータとして扱う）
    if (oldIssuesData && !localStorage.getItem(`dashboard-issues-${sessionId}`)) {
      localStorage.setItem(`dashboard-issues-${sessionId}`, oldIssuesData)
      console.log('Migrated old issues cache to dashboard cache')
    }
    
    if (oldFiltersData && !localStorage.getItem(`dashboard-filters-${sessionId}`)) {
      localStorage.setItem(`dashboard-filters-${sessionId}`, oldFiltersData)
      console.log('Migrated old filters cache to dashboard cache')
    }
    
    // PBL-Viewer用にマイグレーション（全データとして扱う）
    if (oldIssuesData && !localStorage.getItem(`pbl-viewer-issues-${sessionId}`)) {
      localStorage.setItem(`pbl-viewer-issues-${sessionId}`, oldIssuesData)
      console.log('Migrated old issues cache to pbl-viewer cache')
    }
    
    if (oldFiltersData && !localStorage.getItem(`pbl-viewer-filters-${sessionId}`)) {
      // PBL-Viewer用は期間フィルタを除外
      try {
        const filterData = JSON.parse(oldFiltersData)
        if (filterData.filters) {
          const pblFilters = { ...filterData.filters }
          delete pblFilters.created_after
          delete pblFilters.created_before
          delete pblFilters.completed_after
          delete pblFilters.quarter
          
          const pblFilterData = {
            ...filterData,
            filters: pblFilters
          }
          localStorage.setItem(`pbl-viewer-filters-${sessionId}`, JSON.stringify(pblFilterData))
          console.log('Migrated old filters cache to pbl-viewer cache (without period filters)')
        }
      } catch (error) {
        // フォールバック：そのままコピー
        localStorage.setItem(`pbl-viewer-filters-${sessionId}`, oldFiltersData)
        console.log('Migrated old filters cache to pbl-viewer cache (fallback)')
      }
    }
  } catch (error) {
    console.warn('Failed to migrate old cache:', error)
  }
}

// 古いセッションのキャッシュをクリーンアップする関数
const cleanupOldCache = (currentSessionId?: string) => {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('issues-') ||
        key.startsWith('filters-') ||
        key.startsWith('dashboard-issues-') ||
        key.startsWith('dashboard-filters-') ||
        key.startsWith('pbl-viewer-issues-') ||
        key.startsWith('pbl-viewer-filters-')
      )) {
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
  
  // 古いキャッシュから新しいフォーマットへのマイグレーション
  migrateOldCacheToNewFormat(sessionId)
  
  // URLパラメータから期間を取得
  const urlParams = new URLSearchParams(window.location.search)
  const periodStart = urlParams.get('period_start')
  const periodEnd = urlParams.get('period_end')
  
  // 優先順位: URLパラメータ > デフォルト（現在四半期）
  const chartPeriod = (periodStart && periodEnd) 
    ? { start: periodStart, end: periodEnd }
    : getDefaultPeriod()
  
  return {
    // Dashboard用の状態
    dashboardIssues: loadDashboardIssuesFromStorage(sessionId),
    dashboardLoading: false,
    dashboardError: null,
    dashboardFilters: loadDashboardFiltersFromStorage(sessionId),
    dashboardCacheTimestamp: loadDashboardCacheTimestamp(sessionId),
    dashboardWarnings: null,
    
    // PBL-Viewer用の状態
    pblViewerIssues: loadPBLViewerIssuesFromStorage(sessionId),
    pblViewerLoading: false,
    pblViewerError: null,
    pblViewerFilters: loadPBLViewerFiltersFromStorage(sessionId),
    pblViewerCacheTimestamp: loadPBLViewerCacheTimestamp(sessionId),
    
    // 共通状態
    chartPeriod: chartPeriod,
    gitlabConfig: loadGitLabConfigFromStorage(),
    sessionId: sessionId,
    
    // 後方互換性のため残す（廃止予定）
    issues: loadIssuesFromStorage(sessionId),
    loading: false,
    error: null,
    filters: loadFiltersFromStorage(sessionId)
  }
}

const initialState: AppState = createInitialState()

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
}>({ state: initialState, dispatch: () => null })

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Dashboard用のアクション
    case 'SET_DASHBOARD_ISSUES':
      return { ...state, dashboardIssues: action.payload }
    case 'SET_DASHBOARD_LOADING':
      return { ...state, dashboardLoading: action.payload }
    case 'SET_DASHBOARD_ERROR':
      return { ...state, dashboardError: action.payload }
    case 'SET_DASHBOARD_FILTERS':
      return { ...state, dashboardFilters: { ...state.dashboardFilters, ...action.payload } }
    case 'SET_DASHBOARD_CACHE_TIMESTAMP':
      return { ...state, dashboardCacheTimestamp: action.payload }
    case 'SET_DASHBOARD_WARNINGS':
      return { ...state, dashboardWarnings: action.payload }
    
    // PBL-Viewer用のアクション
    case 'SET_PBL_VIEWER_ISSUES':
      return { ...state, pblViewerIssues: action.payload }
    case 'SET_PBL_VIEWER_LOADING':
      return { ...state, pblViewerLoading: action.payload }
    case 'SET_PBL_VIEWER_ERROR':
      return { ...state, pblViewerError: action.payload }
    case 'SET_PBL_VIEWER_FILTERS':
      return { ...state, pblViewerFilters: { ...state.pblViewerFilters, ...action.payload } }
    case 'SET_PBL_VIEWER_CACHE_TIMESTAMP':
      return { ...state, pblViewerCacheTimestamp: action.payload }
    
    // 共通アクション
    case 'SET_CHART_PERIOD':
      return { ...state, chartPeriod: action.payload }
    case 'SET_GITLAB_CONFIG':
      return { ...state, gitlabConfig: { ...state.gitlabConfig, ...action.payload } }
    case 'SET_METADATA':
      // Handle metadata if we need to store it in state later
      return state
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload }
    case 'SESSION_EXPIRED':
      // セッション期限切れ時の処理
      return {
        ...state,
        gitlabConfig: { ...state.gitlabConfig, isConnected: false },
        dashboardIssues: [],
        pblViewerIssues: [],
        dashboardError: 'セッションが期限切れです。GitLab設定を再度行ってください。',
        pblViewerError: 'セッションが期限切れです。GitLab設定を再度行ってください。',
        sessionId: undefined
      }
    case 'RESET_SESSION':
      // セッションリセット時の処理
      return {
        ...state,
        gitlabConfig: { ...state.gitlabConfig, isConnected: false },
        dashboardIssues: [],
        pblViewerIssues: [],
        dashboardError: null,
        pblViewerError: null,
        dashboardCacheTimestamp: null,
        pblViewerCacheTimestamp: null,
        sessionId: undefined
      }
    
    // 後方互換性のため残す（廃止予定）
    case 'SET_ISSUES':
      return { ...state, issues: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    
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
  
  // Dashboard issuesが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (state.dashboardIssues.length > 0) {
      saveDashboardIssuesToStorage(state.dashboardIssues, state.sessionId)
    }
  }, [state.dashboardIssues, state.sessionId])
  
  // PBL-Viewer issuesが変更されたときにlocalStorageに保存
  useEffect(() => {
    if (state.pblViewerIssues.length > 0) {
      savePBLViewerIssuesToStorage(state.pblViewerIssues, state.sessionId)
    }
  }, [state.pblViewerIssues, state.sessionId])
  
  // Dashboard filtersが変更されたときにlocalStorageに保存
  useEffect(() => {
    saveDashboardFiltersToStorage(state.dashboardFilters, state.sessionId)
  }, [state.dashboardFilters, state.sessionId])
  
  // PBL-Viewer filtersが変更されたときにlocalStorageに保存
  useEffect(() => {
    savePBLViewerFiltersToStorage(state.pblViewerFilters, state.sessionId)
  }, [state.pblViewerFilters, state.sessionId])
  
  // 後方互換性のため残す（廃止予定）
  useEffect(() => {
    if (state.issues.length > 0) {
      saveIssuesToStorage(state.issues, state.sessionId)
    }
  }, [state.issues, state.sessionId])
  
  useEffect(() => {
    saveFiltersToStorage(state.filters, state.sessionId)
  }, [state.filters, state.sessionId])
  
  // sessionIdが変更されたときに古いキャッシュをクリーンアップとlocalStorageに保存
  useEffect(() => {
    if (state.sessionId) {
      cleanupOldCache(state.sessionId)
      localStorage.setItem('gitlab-dashboard-session-id', state.sessionId)
    }
  }, [state.sessionId])
  
  // アプリ起動時にセッション検証
  useEffect(() => {
    const validateSessionOnStartup = async () => {
      if (state.sessionId && state.gitlabConfig.isConnected) {
        try {
          const { sessionApi } = await import('../services/api')
          const validation = await sessionApi.validateSession()
          
          if (!validation.valid) {
            console.warn('Session validation failed, attempting session recreation')
            
            // GitLab設定が残っている場合は自動的にセッション再作成を試行
            if (state.gitlabConfig.url && state.gitlabConfig.token && state.gitlabConfig.projectId) {
              try {
                const recreateResult = await sessionApi.recreateSession({
                  gitlab_url: state.gitlabConfig.url,
                  gitlab_token: state.gitlabConfig.token,
                  project_id: state.gitlabConfig.projectId,
                  api_version: state.gitlabConfig.apiVersion,
                  http_proxy: state.gitlabConfig.httpProxy,
                  https_proxy: state.gitlabConfig.httpsProxy,
                  no_proxy: state.gitlabConfig.noProxy
                })
                
                console.log('Session recreated successfully:', recreateResult.session_id)
                dispatch({ type: 'SET_SESSION_ID', payload: recreateResult.session_id })
              } catch (recreateError) {
                console.warn('Session recreation failed:', recreateError)
                dispatch({ type: 'SESSION_EXPIRED' })
              }
            } else {
              // GitLab設定が不完全な場合はセッション期限切れとして処理
              dispatch({ type: 'SESSION_EXPIRED' })
            }
          }
        } catch (error) {
          console.warn('Session validation error:', error)
          // ネットワークエラーなどの場合は何もしない（オフライン対応）
        }
      }
    }
    
    validateSessionOnStartup()
  }, []) // 起動時のみ実行
  
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
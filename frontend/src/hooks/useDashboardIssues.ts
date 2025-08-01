import { useCallback, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'

export const useDashboardIssues = () => {
  const { state, dispatch } = useApp()
  const [isSearching, setIsSearching] = useState(false)
  
  const hasCachedData = useCallback(() => {
    return state.dashboardIssues.length > 0
  }, [state.dashboardIssues])
  
  const refreshFromCache = useCallback(() => {
    // Issues are already loaded from cache in AppContext initialState
    // This function can be used to explicitly check if we have valid cached data
    return hasCachedData()
  }, [hasCachedData])
  
  const fetchIssues = useCallback(async (params: any = {}) => {
    dispatch({ type: 'SET_DASHBOARD_LOADING', payload: true })
    dispatch({ type: 'SET_DASHBOARD_ERROR', payload: null })
    
    try {
      // API パラメータ構築
      const apiParams = {
        ...params,
        ...state.dashboardFilters,
        page: params.page || 1,
        per_page: params.per_page || 10000
      }
      
      // 期間フィルタを追加（チャート期間があれば常に適用）
      if (params.period) {
        apiParams.chart_start_date = params.period.start
        apiParams.chart_end_date = params.period.end
      }
      
      const response = await issuesApi.getIssues(apiParams)
      
      // レスポンスが配列の場合とオブジェクトの場合を処理
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_DASHBOARD_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_DASHBOARD_ISSUES', payload: response.issues || response })
        // 警告情報を設定
        if (response.warnings) {
          dispatch({ type: 'SET_DASHBOARD_WARNINGS', payload: response.warnings })
        }
        if (response.metadata) {
          dispatch({ type: 'SET_METADATA', payload: response.metadata })
        }
      }
      
      // キャッシュタイムスタンプを更新
      dispatch({ type: 'SET_DASHBOARD_CACHE_TIMESTAMP', payload: new Date() })
      
      return response
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_DASHBOARD_ERROR', payload: error.message })
      }
      throw error
    } finally {
      dispatch({ type: 'SET_DASHBOARD_LOADING', payload: false })
    }
  }, [dispatch, state.dashboardFilters])

  const searchIssues = useCallback(async (searchQuery: string) => {
    setIsSearching(true)
    
    try {
      const response = await issuesApi.searchIssues({
        query: searchQuery,
        ...state.dashboardFilters
      })
      
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_DASHBOARD_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_DASHBOARD_ISSUES', payload: response.issues || response })
      }
      return response
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_DASHBOARD_ERROR', payload: error.message })
      }
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [dispatch, state.dashboardFilters])
  
  const exportIssues = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const blob = await issuesApi.exportIssues(state.dashboardFilters, format)
      
      // ダウンロード処理
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard_issues_${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_DASHBOARD_ERROR', payload: error.message })
      }
    }
  }, [state.dashboardFilters, dispatch])
  
  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_DASHBOARD_FILTERS', payload: filters })
  }, [dispatch])

  return {
    issues: state.dashboardIssues,
    loading: state.dashboardLoading,
    error: state.dashboardError,
    filters: state.dashboardFilters,
    isSearching,
    hasCachedData,
    refreshFromCache,
    fetchIssues,
    searchIssues,
    exportIssues,
    setFilters
  }
}
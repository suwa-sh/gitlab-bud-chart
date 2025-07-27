import { useCallback, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'

export const usePBLViewerIssues = () => {
  const { state, dispatch } = useApp()
  const [isSearching, setIsSearching] = useState(false)
  
  const hasCachedData = useCallback(() => {
    return state.pblViewerIssues.length > 0
  }, [state.pblViewerIssues])
  
  const refreshFromCache = useCallback(() => {
    // Issues are already loaded from cache in AppContext initialState
    // This function can be used to explicitly check if we have valid cached data
    return hasCachedData()
  }, [hasCachedData])
  
  const fetchIssues = useCallback(async (params: any = {}) => {
    dispatch({ type: 'SET_PBL_VIEWER_LOADING', payload: true })
    dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: null })
    
    try {
      // API パラメータ構築
      // paramsが明示的に指定されている場合は、state.pblViewerFiltersを上書き
      const apiParams = {
        ...state.pblViewerFilters,
        ...params, // paramsを後から適用してstate.pblViewerFiltersを上書き
        page: params.page || 1,
        per_page: params.per_page || 50
      }
      
      // 期間フィルタがある場合は直接getIssues APIを使用（Quarterラベルフィルタは使用しない）
      if (params.period) {
        const response = await issuesApi.getIssues(apiParams)
        
        // レスポンスが配列の場合とオブジェクトの場合を処理
        if (Array.isArray(response)) {
          dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response })
        } else {
          dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response.issues || response })
          if (response.metadata) {
            dispatch({ type: 'SET_METADATA', payload: response.metadata })
          }
        }
        
        // キャッシュタイムスタンプを更新
        dispatch({ type: 'SET_PBL_VIEWER_CACHE_TIMESTAMP', payload: new Date() })
        
        return response
      }
      
      // Default behavior for non-period filtering  
      const response = await issuesApi.getIssues(apiParams)
      
      // レスポンスが配列の場合とオブジェクトの場合を処理
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response.issues || response })
        if (response.metadata) {
          dispatch({ type: 'SET_METADATA', payload: response.metadata })
        }
      }
      
      // キャッシュタイムスタンプを更新
      dispatch({ type: 'SET_PBL_VIEWER_CACHE_TIMESTAMP', payload: new Date() })
      
      return response
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: error.message })
      }
      throw error
    } finally {
      dispatch({ type: 'SET_PBL_VIEWER_LOADING', payload: false })
    }
  }, [dispatch, state.pblViewerFilters])
  
  const fetchAllIssues = useCallback(async (params: any = {}) => {
    dispatch({ type: 'SET_PBL_VIEWER_LOADING', payload: true })
    dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: null })
    
    try {
      // API パラメータ構築（大きなper_pageを設定）
      // paramsが明示的に指定されている場合は、state.pblViewerFiltersを上書き
      const apiParams = {
        ...state.pblViewerFilters,
        ...params, // paramsを後から適用してstate.pblViewerFiltersを上書き
        page: 1,
        per_page: 10000 // 大量のデータを取得
      }
      
      // 期間フィルタがある場合は直接getIssues APIを使用（Quarterラベルフィルタは使用しない）
      if (params.period) {
        // 期間フィルタをAPIパラメータに追加
        apiParams.chart_start_date = params.period.start
        apiParams.chart_end_date = params.period.end
        
        const response = await issuesApi.getIssues(apiParams)
        
        if (Array.isArray(response)) {
          dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response })
        } else {
          dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response.issues || response })
          if (response.metadata) {
            dispatch({ type: 'SET_METADATA', payload: response.metadata })
          }
        }
        
        // キャッシュタイムスタンプを更新
        dispatch({ type: 'SET_PBL_VIEWER_CACHE_TIMESTAMP', payload: new Date() })
        
        return response
      }
      
      // Default behavior for non-period filtering  
      const response = await issuesApi.getIssues(apiParams)
      
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response.issues || response })
        if (response.metadata) {
          dispatch({ type: 'SET_METADATA', payload: response.metadata })
        }
      }
      
      // キャッシュタイムスタンプを更新
      dispatch({ type: 'SET_PBL_VIEWER_CACHE_TIMESTAMP', payload: new Date() })
      
      return response
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: error.message })
      }
      throw error
    } finally {
      dispatch({ type: 'SET_PBL_VIEWER_LOADING', payload: false })
    }
  }, [dispatch, state.pblViewerFilters])

  const searchIssues = useCallback(async (searchQuery: string, overrideFilters: any = {}) => {
    setIsSearching(true)
    
    try {
      const response = await issuesApi.searchIssues({
        ...state.pblViewerFilters,
        ...overrideFilters, // overrideFiltersを後から適用
        query: searchQuery
      })
      
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ISSUES', payload: response.issues || response })
      }
      return response
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: error.message })
      }
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [dispatch, state.pblViewerFilters])
  
  const exportIssues = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const blob = await issuesApi.exportIssues(state.pblViewerFilters, format)
      
      // ダウンロード処理
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pbl_viewer_issues_${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      // セッション期限切れのチェック
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch({ type: 'SESSION_EXPIRED' })
      } else {
        dispatch({ type: 'SET_PBL_VIEWER_ERROR', payload: error.message })
      }
    }
  }, [state.pblViewerFilters, dispatch])
  
  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: filters })
  }, [dispatch])

  return {
    issues: state.pblViewerIssues,
    loading: state.pblViewerLoading,
    error: state.pblViewerError,
    filters: state.pblViewerFilters,
    isSearching,
    hasCachedData,
    refreshFromCache,
    fetchIssues,
    fetchAllIssues,
    searchIssues,
    exportIssues,
    setFilters
  }
}
import { useCallback, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'
import { getOverlappingQuarters, normalizeQuarterLabel } from '../utils/quarterUtils'

export const useIssues = () => {
  const { state, dispatch } = useApp()
  const [isSearching, setIsSearching] = useState(false)
  
  const hasCachedData = useCallback(() => {
    return state.issues.length > 0
  }, [state.issues])
  
  const refreshFromCache = useCallback(() => {
    // Issues are already loaded from cache in AppContext initialState
    // This function can be used to explicitly check if we have valid cached data
    return hasCachedData()
  }, [hasCachedData])
  
  const fetchIssues = useCallback(async (params: any = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      // API パラメータ構築
      const apiParams = {
        ...params,
        ...state.filters,
        page: params.page || 1,
        per_page: params.per_page || 50
      }
      
      // Period filtering: convert period to overlapping quarters and use search endpoint
      if (params.period) {
        const overlappingQuarters = getOverlappingQuarters(params.period.start, params.period.end)
        
        if (overlappingQuarters.length > 0) {
          // Use search endpoint with multiple quarter labels
          const searchParams = {
            query: apiParams.search || '', // Empty query if no search term
            state: apiParams.state,
            milestone: apiParams.milestone,
            assignee: apiParams.assignee,
            service: apiParams.service,
            kanban_status: apiParams.kanban_status,
            min_point: apiParams.min_point,
            max_point: apiParams.max_point,
            page: apiParams.page,
            per_page: apiParams.per_page,
            sort_by: apiParams.sort_by,
            sort_order: apiParams.sort_order
          }
          
          // For period filtering, we need to make separate requests for each quarter and merge
          // Or use a single search call - let me check the search endpoint capabilities
          const response = await issuesApi.searchIssues(searchParams)
          
          // Filter results by quarters on the client side as a fallback
          if (response.issues) {
            const filteredIssues = response.issues.filter((issue: any) => 
              overlappingQuarters.some(quarter => normalizeQuarterLabel(quarter) === normalizeQuarterLabel(issue.quarter || ''))
            )
            
            // Update the response with filtered issues
            response.issues = filteredIssues
          }
          
          // レスポンスが配列の場合とオブジェクトの場合を処理
          if (Array.isArray(response)) {
            const filteredResponse = response.filter((issue: any) => 
              overlappingQuarters.some(quarter => normalizeQuarterLabel(quarter) === normalizeQuarterLabel(issue.quarter || ''))
            )
            dispatch({ type: 'SET_ISSUES', payload: filteredResponse })
          } else {
            dispatch({ type: 'SET_ISSUES', payload: response.issues || response })
            if (response.metadata) {
              dispatch({ type: 'SET_METADATA', payload: response.metadata })
            }
          }
          
          return response
        } else {
          // No overlapping quarters found, return empty result
          dispatch({ type: 'SET_ISSUES', payload: [] })
          return { issues: [] }
        }
      }
      
      // Default behavior for non-period filtering  
      const response = await issuesApi.getIssues(apiParams)
      
      // レスポンスが配列の場合とオブジェクトの場合を処理
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_ISSUES', payload: response.issues || response })
        if (response.metadata) {
          dispatch({ type: 'SET_METADATA', payload: response.metadata })
        }
      }
      
      return response
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch, state.filters])
  
  const fetchAllIssues = useCallback(async (params: any = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      // API パラメータ構築（大きなper_pageを設定）
      const apiParams = {
        ...params,
        ...state.filters,
        page: 1,
        per_page: 10000 // 大量のデータを取得
      }
      
      // Period filtering: convert period to overlapping quarters and use search endpoint
      if (params.period) {
        const overlappingQuarters = getOverlappingQuarters(params.period.start, params.period.end)
        
        if (overlappingQuarters.length > 0) {
          const searchParams = {
            query: apiParams.search || '',
            state: apiParams.state,
            milestone: apiParams.milestone,
            assignee: apiParams.assignee,
            service: apiParams.service,
            kanban_status: apiParams.kanban_status,
            min_point: apiParams.min_point,
            max_point: apiParams.max_point,
            page: apiParams.page,
            per_page: apiParams.per_page,
            sort_by: apiParams.sort_by,
            sort_order: apiParams.sort_order
          }
          
          const response = await issuesApi.searchIssues(searchParams)
          
          if (response.issues) {
            const filteredIssues = response.issues.filter((issue: any) => 
              overlappingQuarters.some(quarter => normalizeQuarterLabel(quarter) === normalizeQuarterLabel(issue.quarter || ''))
            )
            response.issues = filteredIssues
          }
          
          if (Array.isArray(response)) {
            const filteredResponse = response.filter((issue: any) => 
              overlappingQuarters.some(quarter => normalizeQuarterLabel(quarter) === normalizeQuarterLabel(issue.quarter || ''))
            )
            dispatch({ type: 'SET_ISSUES', payload: filteredResponse })
          } else {
            dispatch({ type: 'SET_ISSUES', payload: response.issues || response })
            if (response.metadata) {
              dispatch({ type: 'SET_METADATA', payload: response.metadata })
            }
          }
          
          return response
        } else {
          dispatch({ type: 'SET_ISSUES', payload: [] })
          return { issues: [] }
        }
      }
      
      // Default behavior for non-period filtering  
      const response = await issuesApi.getIssues(apiParams)
      
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_ISSUES', payload: response.issues || response })
        if (response.metadata) {
          dispatch({ type: 'SET_METADATA', payload: response.metadata })
        }
      }
      
      return response
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch, state.filters])

  const searchIssues = useCallback(async (searchQuery: string) => {
    setIsSearching(true)
    
    try {
      const response = await issuesApi.searchIssues({
        query: searchQuery,
        ...state.filters
      })
      
      if (Array.isArray(response)) {
        dispatch({ type: 'SET_ISSUES', payload: response })
      } else {
        dispatch({ type: 'SET_ISSUES', payload: response.issues || response })
      }
      return response
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [dispatch, state.filters])
  
  const exportIssues = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const blob = await issuesApi.exportIssues(state.filters, format)
      
      // ダウンロード処理
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `issues_${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }, [state.filters, dispatch])
  
  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [dispatch])

  return {
    issues: state.issues,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
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
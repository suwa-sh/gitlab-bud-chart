import { useCallback, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'

export const useIssues = () => {
  const { state, dispatch } = useApp()
  const [isSearching, setIsSearching] = useState(false)
  
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
    fetchIssues,
    searchIssues,
    exportIssues,
    setFilters
  }
}
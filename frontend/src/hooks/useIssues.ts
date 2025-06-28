import { useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'

export const useIssues = () => {
  const { state, dispatch } = useApp()
  
  const fetchIssues = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      const issues = await issuesApi.getIssues(filters)
      dispatch({ type: 'SET_ISSUES', payload: issues })
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
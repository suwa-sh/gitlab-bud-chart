import React from 'react'
import { useApp } from '../../contexts/AppContext'
import { useIssues } from '../../hooks/useIssues'
import { usePBLViewerIssues } from '../../hooks/usePBLViewerIssues'

interface IssueFiltersProps {
  useFetchAll?: boolean
}

export const IssueFilters: React.FC<IssueFiltersProps> = ({ useFetchAll = false }) => {
  const { state, dispatch } = useApp()
  const { fetchIssues } = useIssues()
  const { fetchAllIssues } = usePBLViewerIssues()
  const filters = useFetchAll ? state.pblViewerFilters : state.filters


  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters, [key]: undefined }
    if (useFetchAll) {
      dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: newFilters })
    } else {
      dispatch({ type: 'SET_FILTERS', payload: newFilters })
    }
    
    if (useFetchAll) {
      // PBL Viewerでは期間フィルタを除外
      const filtersWithoutPeriod = { ...newFilters }
      delete filtersWithoutPeriod.created_after
      delete filtersWithoutPeriod.created_before
      delete filtersWithoutPeriod.completed_after
      delete filtersWithoutPeriod.quarter
      fetchAllIssues(filtersWithoutPeriod)
    } else {
      fetchIssues(newFilters)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? undefined : value
    }
    if (useFetchAll) {
      dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: newFilters })
    } else {
      dispatch({ type: 'SET_FILTERS', payload: newFilters })
    }
    
    if (useFetchAll) {
      // PBL Viewerでは期間フィルタを除外
      const filtersWithoutPeriod = { ...newFilters }
      delete filtersWithoutPeriod.created_after
      delete filtersWithoutPeriod.created_before
      delete filtersWithoutPeriod.completed_after
      delete filtersWithoutPeriod.quarter
      fetchAllIssues(filtersWithoutPeriod)
    } else {
      fetchIssues(newFilters)
    }
  }

  return (
    <div className="issue-filters">
      <div className="active-filters">
        <h4>適用中のフィルタ</h4>
        {Object.entries(filters).map(([key, value]) => 
          value && (
            <div key={key} className="active-filter-tag">
              <span>{key}: {value}</span>
              <button 
                onClick={() => handleRemoveFilter(key)}
                className="remove-filter"
              >
                ×
              </button>
            </div>
          )
        )}
      </div>

      <div className="detailed-filters">
        <h4>フィルタ</h4>
        
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="filter-milestone">マイルストーン</label>
            <select
              id="filter-milestone"
              value={filters.milestone || ''}
              onChange={(e) => handleFilterChange('milestone', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="v1.0">v1.0</option>
              <option value="v1.1">v1.1</option>
              <option value="v2.0">v2.0</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="filter-assignee">担当者</label>
            <select
              id="filter-assignee"
              value={filters.assignee || ''}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="user1">user1</option>
              <option value="user2">user2</option>
              <option value="user3">user3</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="filter-service">サービス</label>
            <select
              id="filter-service"
              value={filters.service || ''}
              onChange={(e) => handleFilterChange('service', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="frontend">frontend</option>
              <option value="backend">backend</option>
              <option value="infrastructure">infrastructure</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="filter-kanban-status">カンバンステータス</label>
            <select
              id="filter-kanban-status"
              value={filters.kanban_status || ''}
              onChange={(e) => handleFilterChange('kanban_status', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="作業中">作業中</option>
              <option value="完了">完了</option>
              <option value="ブロック">ブロック</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
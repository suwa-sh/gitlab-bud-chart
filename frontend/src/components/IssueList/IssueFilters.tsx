import { useCallback } from 'react'
import { useApp } from '../../contexts/AppContext'
import { useIssues } from '../../hooks/useIssues'

export const IssueFilters = () => {
  const { state, dispatch } = useApp()
  const { fetchIssues } = useIssues()
  const { filters } = state

  const handleQuickFilter = useCallback((filterType: string) => {
    let newFilters = { ...filters }
    
    switch (filterType) {
      case 'my-issues':
        newFilters.assignee = 'current_user'  // 実装時は実際のユーザー名に置き換え
        break
      case 'open-issues':
        newFilters.state = 'opened'
        break
      case 'completed':
        newFilters.kanban_status = '完了'
        break
      case 'high-priority':
        newFilters.min_point = 5
        break
      case 'this-quarter':
        const currentQuarter = getCurrentQuarter()
        newFilters.quarter = currentQuarter
        break
      default:
        break
    }
    
    dispatch({ type: 'SET_FILTERS', payload: newFilters })
    fetchIssues(newFilters)
  }, [filters, dispatch, fetchIssues])

  const getCurrentQuarter = () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    const year = now.getFullYear()
    return `FY${year}Q${quarter}`
  }

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters, [key]: undefined }
    dispatch({ type: 'SET_FILTERS', payload: newFilters })
    fetchIssues(newFilters)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...state.filters,
      [key]: value === '' ? undefined : value
    }
    dispatch({ type: 'SET_FILTERS', payload: newFilters })
    fetchIssues(newFilters)
  }

  return (
    <div className="issue-filters">
      <h3>クイックフィルタ</h3>
      
      <div className="quick-filters">
        <button 
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('my-issues')}
        >
          自分のIssue
        </button>
        
        <button 
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('open-issues')}
        >
          Open Issues
        </button>
        
        <button 
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('completed')}
        >
          完了済み
        </button>
        
        <button 
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('high-priority')}
        >
          高ポイント (5+)
        </button>
        
        <button 
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('this-quarter')}
        >
          今四半期
        </button>
      </div>
      
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
        <h4>詳細フィルタ</h4>
        
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="filter-milestone">マイルストーン</label>
            <select
              id="filter-milestone"
              value={state.filters.milestone || ''}
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
              value={state.filters.assignee || ''}
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
              value={state.filters.service || ''}
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
              value={state.filters.kanban_status || ''}
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
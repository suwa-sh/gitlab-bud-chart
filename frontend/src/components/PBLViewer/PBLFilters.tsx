import { useState, useMemo } from 'react'
import { useApp } from '../../contexts/AppContext'
import { usePBLViewerIssues } from '../../hooks/usePBLViewerIssues'
import { Issue } from '../../types/api'

interface PBLFiltersProps {
  issues: Issue[]
}

export const PBLFilters = ({ issues }: PBLFiltersProps) => {
  const { state, dispatch } = useApp()
  const { fetchAllIssues } = usePBLViewerIssues()
  const [showFilters, setShowFilters] = useState(false)
  
  const filters = state.pblViewerFilters

  // マイルストーン一覧
  const milestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))]
  
  // フィルタ用のユニークな値
  const filterOptions = useMemo(() => {
    const assignees = Array.from(new Set(issues.map(i => i.assignee).filter(Boolean)))
    const kanbanStatuses = Array.from(new Set(issues.map(i => i.kanban_status).filter(Boolean)))
    const services = Array.from(new Set(issues.map(i => i.service).filter(Boolean)))
    const quarters = Array.from(new Set(issues.map(i => i.quarter).filter(Boolean)))
    
    return {
      assignees: assignees.sort(),
      kanbanStatuses: kanbanStatuses.sort(),
      services: services.sort(),
      quarters: quarters.sort()
    }
  }, [issues])

  const handleFilterChange = (key: string, value: string | number | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value
    }
    
    dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: newFilters })
    
    // PBL Viewerでは期間フィルタを除外して全issueを取得
    const filtersWithoutPeriod = { ...newFilters }
    delete filtersWithoutPeriod.created_after
    delete filtersWithoutPeriod.created_before
    delete filtersWithoutPeriod.completed_after
    delete filtersWithoutPeriod.quarter
    fetchAllIssues(filtersWithoutPeriod)
  }

  const activeFilterCount = filters ? 
    Object.entries(filters).filter(([_, value]) => 
      value !== undefined && value !== null && value !== ''
    ).length : 0

  return (
    <div className="pbl-filters">
      <div className="filter-controls">
        <button 
          className="detail-filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="filter-icon">🔍</span>
          フィルタ
          {activeFilterCount > 0 && (
            <span className="active-filter-count">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 詳細フィルタエリア */}
      {showFilters && (
        <div className="detail-filters">
          {/* Row 1: Service, Milestone, Epic, Title */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Service:</label>
              <select
                value={filters.service || ''}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Milestone:</label>
              <select
                value={filters.milestone || ''}
                onChange={(e) => handleFilterChange('milestone', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {milestones.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Epic:</label>
              <select
                value={filters.is_epic || ''}
                onChange={(e) => handleFilterChange('is_epic', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                <option value="epic">Epic</option>
                <option value="normal">通常</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Title:</label>
              <input
                type="text"
                placeholder="タイトル検索..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
          
          {/* Row 2: Point, Kanban Status, Assignee */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Point:</label>
              <div className="point-range-inputs">
                <input
                  type="number"
                  placeholder="最小"
                  value={filters.min_point || ''}
                  onChange={(e) => handleFilterChange('min_point', e.target.value ? Number(e.target.value) : undefined)}
                  className="filter-input number-input"
                  min="0"
                />
                <span className="range-separator">≤</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={filters.max_point || ''}
                  onChange={(e) => handleFilterChange('max_point', e.target.value ? Number(e.target.value) : undefined)}
                  className="filter-input number-input"
                  min="0"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Kanban Status:</label>
              <select
                value={filters.kanban_status || ''}
                onChange={(e) => handleFilterChange('kanban_status', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.kanbanStatuses.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Assignee:</label>
              <select
                value={filters.assignee || ''}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.assignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Quarter:</label>
              <select
                value={filters.quarter || ''}
                onChange={(e) => handleFilterChange('quarter', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.quarters.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Row 3: Created At, Completed At, State */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Created At:</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={filters.created_after || ''}
                  onChange={(e) => handleFilterChange('created_after', e.target.value)}
                  className="filter-input date-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="date"
                  value={filters.created_before || ''}
                  onChange={(e) => handleFilterChange('created_before', e.target.value)}
                  className="filter-input date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Completed At:</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={filters.completed_after || ''}
                  onChange={(e) => handleFilterChange('completed_after', e.target.value)}
                  className="filter-input date-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="date"
                  value={filters.completed_before || ''}
                  onChange={(e) => handleFilterChange('completed_before', e.target.value)}
                  className="filter-input date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>State:</label>
              <select
                value={filters.state || ''}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                <option value="opened">Opened</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          
          {/* フィルタリセットボタン */}
          <div className="filter-reset-section">
            <button 
              className="filter-reset-btn"
              onClick={async () => {
                const resetFilters = {
                  search: '',
                  milestone: '',
                  assignee: '',
                  kanban_status: '',
                  service: '',
                  state: '',
                  min_point: undefined,
                  max_point: undefined,
                  created_after: '',
                  created_before: '',
                  completed_after: '',
                  completed_before: '',
                  is_epic: '',
                  quarter: ''
                }
                
                // 状態をリセット
                dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: resetFilters })
                
                // リセット後のフィルタで明示的にAPIを呼び出し（全てのフィルタをクリア）
                try {
                  await fetchAllIssues(resetFilters)
                } catch (error) {
                  console.error('Filter reset failed:', error)
                }
              }}
            >
              <span className="reset-icon">🔄</span>
              フィルタをリセット
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
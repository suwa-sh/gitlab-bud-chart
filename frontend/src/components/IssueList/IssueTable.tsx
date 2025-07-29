import { useState, useMemo } from 'react'
import { Issue } from '../../types/api'
import { IssueTableFilters } from './IssueTableFilters'
import { IssueTableRow } from './IssueTableRow'
import { TablePagination } from '../Common/TablePagination'
import { LoadingSpinner } from '../Common/LoadingSpinner'
import './IssueTable.css'

interface IssueTableProps {
  issues: Issue[]
  loading: boolean
  showFilters?: boolean
  pageSize?: number
  allowShowAll?: boolean
  initialShowAll?: boolean
  issueFilters?: {
    search: string
    milestone: string
    assignee: string
    kanban_status: string
    service: string
    state: string
    point_min?: number
    point_max?: number
    created_at_from: string
    created_at_to: string
    completed_at_from: string
    completed_at_to: string
    is_epic: string
  }
  sortConfig?: {
    key: string
    direction: 'asc' | 'desc'
  } | null
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void
}

export const IssueTable = ({ 
  issues, 
  loading, 
  showFilters = false, 
  pageSize = 20,
  allowShowAll = false,
  initialShowAll = false,
  issueFilters,
  sortConfig: externalSortConfig,
  onSortChange
}: IssueTableProps) => {
  const [filters, setFilters] = useState({
    search: '',
    milestone: '',
    assignee: '',
    kanban_status: '',
    service: '',
    state: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [showAll, setShowAll] = useState(initialShowAll)
  const [internalSortConfig, setInternalSortConfig] = useState<{
    key: keyof Issue
    direction: 'asc' | 'desc'
  } | null>(null)
  
  // Use external sort config if provided, otherwise use internal
  const sortConfig = externalSortConfig || internalSortConfig

  // フィルタリングロジック（issueFiltersが渡された場合はそれを使用、そうでなければ内部フィルタを使用）
  const filteredIssues = useMemo(() => {
    if (issueFilters) {
      // 外部からフィルタリング済みのissuesが渡されている場合はそのまま使用
      return issues
    }
    // 内部フィルタを使用（PBL-Viewerなど）
    return issues.filter(issue => {
      if (filters.search && 
          !issue.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.milestone && issue.milestone !== filters.milestone) {
        return false
      }
      if (filters.assignee && issue.assignee !== filters.assignee) {
        return false
      }
      if (filters.kanban_status && issue.kanban_status !== filters.kanban_status) {
        return false
      }
      if (filters.service && issue.service !== filters.service) {
        return false
      }
      if (filters.state && issue.state !== filters.state) {
        return false
      }
      return true
    })
  }, [issues, filters, issueFilters])

  // ソートロジック
  const sortedIssues = useMemo(() => {
    if (!sortConfig) return filteredIssues
    
    return [...filteredIssues].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Issue]
      const bValue = b[sortConfig.key as keyof Issue]
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredIssues, sortConfig])

  // ページネーション
  const paginatedIssues = useMemo(() => {
    if (showAll) {
      return sortedIssues
    }
    const startIndex = (currentPage - 1) * pageSize
    return sortedIssues.slice(startIndex, startIndex + pageSize)
  }, [sortedIssues, currentPage, pageSize, showAll])

  const handleSort = (key: keyof Issue) => {
    const newDirection = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    
    if (onSortChange) {
      // If external handler provided, use it
      onSortChange(key, newDirection)
    } else {
      // Otherwise use internal state
      setInternalSortConfig({
        key,
        direction: newDirection
      })
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="issue-table-container">
      {showFilters && (
        <IssueTableFilters 
          filters={filters}
          onFiltersChange={setFilters}
          issues={issues}
        />
      )}
      
      <div className="table-info">
        <div className="table-info-left">
          <h3 className="issues-title">Issues</h3>
          <span>総数: {filteredIssues.length}件</span>
          {filteredIssues.length !== issues.length && (
            <span>(全{issues.length}件中)</span>
          )}
          {showAll && (
            <span className="show-all-indicator">
              （全量表示中）
              {filteredIssues.length > 1000 && (
                <span className="performance-warning"> - 大量データ注意</span>
              )}
            </span>
          )}
        </div>
        {allowShowAll && (
          <div className="table-info-right">
            <button
              onClick={() => {
                setShowAll(!showAll)
                setCurrentPage(1) // Reset to first page when toggling
              }}
              className="show-all-toggle"
            >
              {showAll ? 'ページ表示' : '全量表示'}
            </button>
          </div>
        )}
      </div>
      
      <div className={`table-wrapper ${showAll ? 'show-all' : ''}`}>
        <table className="issue-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('service')}>
                Service
                {sortConfig?.key === 'service' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('milestone')}>
                Milestone
                {sortConfig?.key === 'milestone' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('is_epic')}>
                Epic
                {sortConfig?.key === 'is_epic' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('title')}>
                Title
                {sortConfig?.key === 'title' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('point')}>
                Point
                {sortConfig?.key === 'point' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('kanban_status')}>
                Kanban Status
                {sortConfig?.key === 'kanban_status' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('assignee')}>
                Assignee
                {sortConfig?.key === 'assignee' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('quarter')}>
                Quarter
                {sortConfig?.key === 'quarter' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('created_at')}>
                Created At
                {sortConfig?.key === 'created_at' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('completed_at')}>
                Completed At
                {sortConfig?.key === 'completed_at' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
              <th onClick={() => handleSort('state')}>
                State
                {sortConfig?.key === 'state' && (
                  <span className={`sort-icon ${sortConfig.direction}`}>↕</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIssues.map(issue => (
              <IssueTableRow key={issue.id} issue={issue} />
            ))}
          </tbody>
        </table>
      </div>
      
      {!showAll && sortedIssues.length > pageSize && (
        <TablePagination 
          currentPage={currentPage}
          totalItems={sortedIssues.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}
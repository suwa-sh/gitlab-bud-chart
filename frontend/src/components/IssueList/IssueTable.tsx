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
}

export const IssueTable = ({ 
  issues, 
  loading, 
  showFilters = false, 
  pageSize = 20 
}: IssueTableProps) => {
  const [filters, setFilters] = useState({
    search: '',
    milestone: '',
    assignee: '',
    kanban_status: '',
    service: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Issue
    direction: 'asc' | 'desc'
  } | null>(null)

  // フィルタリングロジック
  const filteredIssues = useMemo(() => {
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
      return true
    })
  }, [issues, filters])

  // ソートロジック
  const sortedIssues = useMemo(() => {
    if (!sortConfig) return filteredIssues
    
    return [...filteredIssues].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      
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
    const startIndex = (currentPage - 1) * pageSize
    return sortedIssues.slice(startIndex, startIndex + pageSize)
  }, [sortedIssues, currentPage, pageSize])

  const handleSort = (key: keyof Issue) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    })
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
        <span>総数: {filteredIssues.length}件</span>
        {filteredIssues.length !== issues.length && (
          <span>(全{issues.length}件中)</span>
        )}
      </div>
      
      <div className="table-wrapper">
        <table className="issue-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('milestone')}>
                Milestone
                {sortConfig?.key === 'milestone' && (
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
      
      {sortedIssues.length > pageSize && (
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
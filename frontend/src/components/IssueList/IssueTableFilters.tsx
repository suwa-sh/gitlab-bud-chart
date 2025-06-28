import { useMemo } from 'react'
import { Issue } from '../../types/api'

interface IssueTableFiltersProps {
  filters: {
    search: string
    milestone: string
    assignee: string
    kanban_status: string
    service: string
  }
  onFiltersChange: (filters: any) => void
  issues: Issue[]
}

export const IssueTableFilters = ({ 
  filters, 
  onFiltersChange, 
  issues 
}: IssueTableFiltersProps) => {
  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const milestones = Array.from(new Set(issues.map(i => i.milestone).filter(Boolean)))
    const assignees = Array.from(new Set(issues.map(i => i.assignee).filter(Boolean)))
    const kanbanStatuses = Array.from(new Set(issues.map(i => i.kanban_status).filter(Boolean)))
    const services = Array.from(new Set(issues.map(i => i.service).filter(Boolean)))
    
    return {
      milestones: milestones.sort(),
      assignees: assignees.sort(),
      kanbanStatuses: kanbanStatuses.sort(),
      services: services.sort()
    }
  }, [issues])

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      milestone: '',
      assignee: '',
      kanban_status: '',
      service: ''
    })
  }

  return (
    <div className="issue-table-filters">
      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="search">検索</label>
          <input
            id="search"
            type="text"
            placeholder="タイトルで検索..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="milestone">マイルストーン</label>
          <select
            id="milestone"
            value={filters.milestone}
            onChange={(e) => handleFilterChange('milestone', e.target.value)}
          >
            <option value="">すべて</option>
            {filterOptions.milestones.map(milestone => (
              <option key={milestone} value={milestone}>
                {milestone}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="assignee">担当者</label>
          <select
            id="assignee"
            value={filters.assignee}
            onChange={(e) => handleFilterChange('assignee', e.target.value)}
          >
            <option value="">すべて</option>
            {filterOptions.assignees.map(assignee => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="kanban_status">カンバンステータス</label>
          <select
            id="kanban_status"
            value={filters.kanban_status}
            onChange={(e) => handleFilterChange('kanban_status', e.target.value)}
          >
            <option value="">すべて</option>
            {filterOptions.kanbanStatuses.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="service">サービス</label>
          <select
            id="service"
            value={filters.service}
            onChange={(e) => handleFilterChange('service', e.target.value)}
          >
            <option value="">すべて</option>
            {filterOptions.services.map(service => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-actions">
          <button 
            type="button" 
            onClick={clearFilters}
            className="clear-filters-btn"
          >
            クリア
          </button>
        </div>
      </div>
    </div>
  )
}
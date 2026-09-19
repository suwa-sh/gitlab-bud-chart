import { useState, useMemo } from 'react'
import { Issue } from '../../types/api'

interface IssueTableFiltersProps {
  filters: {
    search: string
    milestone: string
    assignee: string
    kanban_status: string
    service: string
    state?: string
  }
  onFiltersChange: (filters: any) => void
  issues: Issue[]
}

export const IssueTableFilters = ({
  filters,
  onFiltersChange,
  issues,
}: IssueTableFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const milestones = Array.from(
      new Set(issues.map((i) => i.milestone).filter(Boolean)),
    )
    const assignees = Array.from(
      new Set(issues.map((i) => i.assignee).filter(Boolean)),
    )
    const kanbanStatuses = Array.from(
      new Set(issues.map((i) => i.kanban_status).filter(Boolean)),
    )
    const services = Array.from(
      new Set(issues.map((i) => i.service).filter(Boolean)),
    )

    return {
      milestones: milestones.sort(),
      assignees: assignees.sort(),
      kanbanStatuses: kanbanStatuses.sort(),
      services: services.sort(),
    }
  }, [issues])

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      milestone: '',
      assignee: '',
      kanban_status: '',
      service: '',
      state: '',
    })
  }

  const activeFilterCount = Object.values(filters).filter((v) => v).length

  return (
    <div className="issue-table-filters">
      <div className="filters-header">
        <button
          className="filters-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="filter-icon">🔍</span>
          フィルタ
          {activeFilterCount > 0 && (
            <span className="active-filter-count">{activeFilterCount}</span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button className="clear-filters" onClick={handleClearFilters}>
            クリア
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="filter-row">
            <div className="filter-group">
              <label>検索</label>
              <input
                type="text"
                placeholder="タイトル検索..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Milestone</label>
              <select
                value={filters.milestone}
                onChange={(e) =>
                  handleFilterChange('milestone', e.target.value)
                }
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.milestones.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Assignee</label>
              <select
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Kanban Status</label>
              <select
                value={filters.kanban_status}
                onChange={(e) =>
                  handleFilterChange('kanban_status', e.target.value)
                }
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.kanbanStatuses.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Service</label>
              <select
                value={filters.service}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>State</label>
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
        </div>
      )}
    </div>
  )
}

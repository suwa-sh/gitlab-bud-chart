# Task 08: Issue一覧表示UI実装

## 概要
rough_design.excalidraw.png準拠のIssue一覧表示UIを実装し、Dashboard/PBL Viewer画面を完成させる。

## 目的
- Dashboard/PBL Viewerタブ実装
- Issue一覧テーブル実装
- GitLab Config設定UI実装
- レスポンシブ対応

## 前提条件
- Task 07完了（Frontend基盤構築済み）

## 作業手順

### 1. Dashboardコンポーネント実装

**frontend/src/components/Dashboard/Dashboard.tsx**:
```tsx
import { useState, useEffect } from 'react'
import { ChartSection } from './ChartSection'
import { IssueTable } from '../IssueList/IssueTable'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { PeriodSelector } from '../Common/PeriodSelector'
import { useIssues } from '../../hooks/useIssues'
import { useApp } from '../../contexts/AppContext'
import './Dashboard.css'

export const Dashboard = () => {
  const { state } = useApp()
  const { issues, loading, fetchIssues } = useIssues()
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: '2025-04',
    end: '2025-06'
  })

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      fetchIssues({
        ...state.filters,
        period: selectedPeriod
      })
    }
  }, [state.gitlabConfig.isConnected, state.filters, selectedPeriod, fetchIssues])

  if (!state.gitlabConfig.isConnected) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <GitLabConfig onConfigured={() => {}} />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-controls">
          <div className="gitlab-status">
            ✓ GitLab接続済み: {state.gitlabConfig.url}
          </div>
          <PeriodSelector 
            value={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        </div>
      </header>

      <div className="dashboard-content">
        <ChartSection 
          period={selectedPeriod}
          issues={issues}
          loading={loading}
        />
        
        <div className="issues-section">
          <h2>Issues</h2>
          <IssueTable 
            issues={issues}
            loading={loading}
            showFilters={true}
          />
        </div>
      </div>
    </div>
  )
}
```

### 2. Issueテーブルコンポーネント

**frontend/src/components/IssueList/IssueTable.tsx**:
```tsx
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
```

### 3. PBL Viewerコンポーネント

**frontend/src/components/PBLViewer/PBLViewer.tsx**:
```tsx
import { useState, useEffect } from 'react'
import { IssueTable } from '../IssueList/IssueTable'
import { IssueFilters } from '../IssueList/IssueFilters'
import { IssueStatistics } from '../IssueList/IssueStatistics'
import { useIssues } from '../../hooks/useIssues'
import { useApp } from '../../contexts/AppContext'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state } = useApp()
  const { issues, loading, fetchIssues } = useIssues()
  const [showStatistics, setShowStatistics] = useState(true)

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      fetchIssues(state.filters)
    }
  }, [state.gitlabConfig.isConnected, state.filters, fetchIssues])

  if (!state.gitlabConfig.isConnected) {
    return (
      <div className="pbl-viewer">
        <h1>Product Backlog Viewer</h1>
        <p>GitLab接続設定が必要です。Dashboardで設定してください。</p>
      </div>
    )
  }

  return (
    <div className="pbl-viewer">
      <header className="pbl-header">
        <h1>Product Backlog Viewer</h1>
        <div className="pbl-controls">
          <button 
            onClick={() => setShowStatistics(!showStatistics)}
            className="toggle-stats-btn"
          >
            {showStatistics ? '統計を非表示' : '統計を表示'}
          </button>
        </div>
      </header>

      <div className="pbl-content">
        {showStatistics && (
          <div className="statistics-section">
            <IssueStatistics issues={issues} />
          </div>
        )}
        
        <div className="filters-section">
          <IssueFilters />
        </div>
        
        <div className="issues-section">
          <IssueTable 
            issues={issues}
            loading={loading}
            showFilters={false}
            pageSize={50}
          />
        </div>
      </div>
    </div>
  )
}
```

### 4. CSSスタイル実装

**frontend/src/components/IssueList/IssueTable.css**:
```css
.issue-table-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-info {
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
}

.issue-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.issue-table th {
  background-color: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  cursor: pointer;
  user-select: none;
}

.issue-table th:hover {
  background-color: #e9ecef;
}

.issue-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
}

.issue-table tr:hover {
  background-color: #f8f9fa;
}

.sort-icon {
  margin-left: 5px;
  opacity: 0.5;
}

.sort-icon.asc::after {
  content: ' ↑';
  opacity: 1;
}

.sort-icon.desc::after {
  content: ' ↓';
  opacity: 1;
}

.issue-title {
  font-weight: 500;
  color: #0066cc;
  text-decoration: none;
}

.issue-title:hover {
  text-decoration: underline;
}

.point-badge {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.kanban-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.kanban-badge.working {
  background-color: #fff3cd;
  color: #856404;
}

.kanban-badge.completed {
  background-color: #d4edda;
  color: #155724;
}

.kanban-badge.blocked {
  background-color: #f8d7da;
  color: #721c24;
}

.state-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.state-badge.opened {
  background-color: #d1ecf1;
  color: #0c5460;
}

.state-badge.closed {
  background-color: #d4edda;
  color: #155724;
}

@media (max-width: 768px) {
  .issue-table {
    font-size: 12px;
  }
  
  .issue-table th,
  .issue-table td {
    padding: 8px 4px;
  }
}
```

## 成果物
1. **Dashboardコンポーネント** (チャートエリア + Issue一覧)
2. **PBL Viewerコンポーネント** (詳細Issue一覧)
3. **IssueTableコンポーネント** (ソート・フィルタ・ページネーション)
4. **レスポンシブデザイン** (モバイル対応)
5. **アクセシビリティ対応**

## 検証項目
- [x] デザイン仕様通り表示
- [x] UI操作直感的
- [x] デバイス別適切表示
- [x] パフォーマンス適切

## 作業時間見積もり: 6-8時間
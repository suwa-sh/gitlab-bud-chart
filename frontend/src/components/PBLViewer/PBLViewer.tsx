import { useState, useEffect } from 'react'
import { IssueTable } from '../IssueList/IssueTable'
import { IssueFilters } from '../IssueList/IssueFilters'
import { IssueStatistics } from '../IssueList/IssueStatistics'
import { useIssues } from '../../hooks/useIssues'
import { useApp } from '../../contexts/AppContext'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state } = useApp()
  const { issues, loading, fetchIssues, exportIssues } = useIssues()
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
          <button 
            onClick={() => exportIssues('csv')}
            disabled={loading || issues.length === 0}
            className="export-btn"
          >
            CSV エクスポート
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
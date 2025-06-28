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
  const { issues, loading, fetchIssues, exportIssues } = useIssues()
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
          <div className="issues-section-header">
            <h2>Issues</h2>
            <button 
              className="export-btn"
              onClick={() => exportIssues('csv')}
              disabled={loading || issues.length === 0}
            >
              CSV エクスポート
            </button>
          </div>
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
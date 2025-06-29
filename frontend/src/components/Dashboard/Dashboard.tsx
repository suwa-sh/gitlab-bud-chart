import { useState, useEffect } from 'react'
import { ChartSection } from './ChartSection'
import { IssueTable } from '../IssueList/IssueTable'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { PeriodSelector } from '../Common/PeriodSelector'
import { useIssues } from '../../hooks/useIssues'
import { useApp } from '../../contexts/AppContext'
import './Dashboard.css'

export const Dashboard = () => {
  const { state, dispatch } = useApp()
  const { issues, loading, fetchIssues, exportIssues } = useIssues()
  const [showEditConfig, setShowEditConfig] = useState(false)

  const handlePeriodChange = (newPeriod: { start: string; end: string }) => {
    dispatch({ type: 'SET_CHART_PERIOD', payload: newPeriod })
  }

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      fetchIssues({
        ...state.filters,
        period: state.chartPeriod
      })
    }
  }, [state.gitlabConfig.isConnected, state.filters, state.chartPeriod, fetchIssues])

  if (!state.gitlabConfig.isConnected) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <GitLabConfig onConfigured={() => {}} />
      </div>
    )
  }

  if (showEditConfig) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <GitLabConfig 
          editMode={true}
          onConfigured={() => setShowEditConfig(false)}
          onCancel={() => setShowEditConfig(false)}
        />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-controls">
          <div className="gitlab-status">
            <span>✓ GitLab接続済み: {state.gitlabConfig.url}</span>
            <button 
              className="edit-config-btn"
              onClick={() => setShowEditConfig(true)}
              title="GitLab設定を変更"
            >
              設定変更
            </button>
          </div>
          <PeriodSelector 
            value={state.chartPeriod}
            onChange={handlePeriodChange}
          />
        </div>
      </header>

      <div className="dashboard-content">
        <ChartSection 
          period={state.chartPeriod}
          issues={issues}
          loading={loading}
        />
        
        <div className="issues-section">
          <div className="issues-section-header">
            <div className="issues-title-group">
              <h2>Issues</h2>
              <div className="period-indicator">
                <span className="period-label">期間:</span>
                <span className="period-dates">{state.chartPeriod.start} 〜 {state.chartPeriod.end}</span>
              </div>
            </div>
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
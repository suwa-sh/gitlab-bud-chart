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
  }, [
    state.gitlabConfig.isConnected, 
    state.gitlabConfig.url,
    state.gitlabConfig.token,
    state.gitlabConfig.projectId,
    state.filters, 
    state.chartPeriod, 
    fetchIssues
  ])

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
          onConfigured={() => {
            setShowEditConfig(false)
            // 設定変更後に強制的にIssuesを再取得
            if (state.gitlabConfig.isConnected) {
              fetchIssues({
                ...state.filters,
                period: state.chartPeriod
              })
            }
          }}
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
            <div className="gitlab-status-badge">
              <div className="status-indicator">
                <span className="status-icon">🟢</span>
                <div className="status-text">
                  {state.gitlabConfig.projectNamespace && state.gitlabConfig.projectName ? (
                    <a 
                      href={`${state.gitlabConfig.url}/${state.gitlabConfig.projectNamespace}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-name project-link"
                      title="GitLabプロジェクトページを開く"
                    >
                      {state.gitlabConfig.projectName}
                    </a>
                  ) : (
                    <span className="project-name">GitLab接続済み</span>
                  )}
                  {state.gitlabConfig.projectId && (
                    <span className="project-id">#{state.gitlabConfig.projectId}</span>
                  )}
                </div>
              </div>
              {state.gitlabConfig.httpProxy && (
                <span className="proxy-indicator" title="プロキシ経由で接続">🌐</span>
              )}
            </div>
            <button 
              className="edit-config-btn"
              onClick={() => setShowEditConfig(true)}
              title="GitLab設定を変更"
            >
              設定変更
            </button>
          </div>
        </div>
      </header>

      <div className="period-controls">
        <PeriodSelector 
          value={state.chartPeriod}
          onChange={handlePeriodChange}
        />
      </div>

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
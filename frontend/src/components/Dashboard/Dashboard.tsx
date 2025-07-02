import { useState, useEffect, useMemo } from 'react'
import { ChartSection } from './ChartSection'
import { IssueTable } from '../IssueList/IssueTable'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { useDashboardIssues } from '../../hooks/useDashboardIssues'
import { useApp } from '../../contexts/AppContext'
import { filterIssues } from '../../utils/filterUtils'
import './Dashboard.css'

export const Dashboard = () => {
  const { state, dispatch } = useApp()
  const { issues, loading, fetchIssues, exportIssues, hasCachedData } = useDashboardIssues()
  const [showEditConfig, setShowEditConfig] = useState(false)
  const [issueFilters, setIssueFilters] = useState({
    search: '',
    milestone: '',
    assignee: '',
    kanban_status: '',
    service: '',
    state: '',
    point_min: undefined as number | undefined,
    point_max: undefined as number | undefined,
    created_at_from: '',
    created_at_to: '',
    completed_at_from: '',
    completed_at_to: '',
    is_epic: ''
  })

  const handlePeriodChange = (newPeriod: { start: string; end: string }) => {
    dispatch({ type: 'SET_CHART_PERIOD', payload: newPeriod })
  }

  // フィルタリングされたIssuesを計算
  const filteredIssues = useMemo(() => {
    return filterIssues(issues, issueFilters)
  }, [issues, issueFilters])

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      fetchIssues({
        ...state.dashboardFilters,
        period: state.chartPeriod
      })
    }
  }, [
    state.gitlabConfig.isConnected, 
    state.gitlabConfig.url,
    state.gitlabConfig.token,
    state.gitlabConfig.projectId,
    state.dashboardFilters, 
    state.chartPeriod, 
    fetchIssues
  ])

  // セッション期限切れイベントをリッスン
  useEffect(() => {
    const handleSessionExpired = () => {
      setShowEditConfig(true)
    }

    window.addEventListener('session-expired', handleSessionExpired)
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired)
    }
  }, [])

  // セッション期限切れエラーをチェック
  useEffect(() => {
    if (state.dashboardError?.includes('セッションが期限切れ')) {
      setShowEditConfig(true)
    }
  }, [state.dashboardError])

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
                ...state.dashboardFilters,
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
        <div className="dashboard-controls pbl-controls">
          {hasCachedData() && !loading && state.dashboardCacheTimestamp && (
            <span className="cache-indicator" title="データはキャッシュから復元されました">
              📄 {state.dashboardCacheTimestamp.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {state.dashboardCacheTimestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}時点
            </span>
          )}
          <button 
            onClick={() => {
              fetchIssues({
                ...state.dashboardFilters,
                period: state.chartPeriod
              })
            }}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? '読み込み中...' : 'データ再取得'}
          </button>
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

      <div className="dashboard-content">
        <ChartSection 
          period={state.chartPeriod}
          issues={filteredIssues}
          loading={loading}
          onPeriodChange={handlePeriodChange}
          issueFilters={issueFilters}
          onIssueFiltersChange={setIssueFilters}
          onExportIssues={() => exportIssues('csv')}
        />
        
        <div className="issues-section">
          <IssueTable 
            issues={filteredIssues}
            loading={loading}
            showFilters={false}
          />
        </div>
      </div>
    </div>
  )
}
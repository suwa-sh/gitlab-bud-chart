import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChartSection } from './ChartSection'
import { IssueTable } from '../IssueList/IssueTable'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { useDashboardIssues } from '../../hooks/useDashboardIssues'
import { useApp } from '../../contexts/AppContext'
import { filterIssues } from '../../utils/filterUtils'
import { parseURLParams, generateShareURL, copyToClipboard, buildURLParams } from '../../utils/urlUtils'
import './Dashboard.css'

export const Dashboard = () => {
  const { state, dispatch } = useApp()
  const { issues, loading, fetchIssues, exportIssues, hasCachedData } = useDashboardIssues()
  const [showEditConfig, setShowEditConfig] = useState(false)
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
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

  // URLパラメータから初期値を読み込み
  useEffect(() => {
    const urlFilters = parseURLParams(searchParams)
    
    if (Object.keys(urlFilters).length > 0) {
      const { sortKey, sortDirection, period_start, period_end, ...filters } = urlFilters
      
      // フィルタを復元
      const restoredFilters = {
        search: filters.search || '',
        milestone: filters.milestone || '',
        assignee: filters.assignee || '',
        kanban_status: filters.kanban_status || '',
        service: filters.service || '',
        state: filters.state || '',
        point_min: filters.min_point,
        point_max: filters.max_point,
        created_at_from: filters.created_after || '',
        created_at_to: filters.created_before || '',
        completed_at_from: filters.completed_after || '',
        completed_at_to: filters.completed_before || '',
        is_epic: filters.is_epic || ''
      }
      setIssueFilters(restoredFilters)
      
      // 期間を復元
      if (period_start && period_end) {
        dispatch({ type: 'SET_CHART_PERIOD', payload: { start: period_start, end: period_end } })
      }
      
      // ソート設定を復元
      if (sortKey && sortDirection) {
        setSortConfig({ key: sortKey, direction: sortDirection })
      }
    }
  }, [])

  const handlePeriodChange = (newPeriod: { start: string; end: string }) => {
    dispatch({ type: 'SET_CHART_PERIOD', payload: newPeriod })
    
    // URLを更新
    const currentParams = Object.fromEntries(searchParams)
    const updatedParams = {
      ...currentParams,
      period_start: newPeriod.start,
      period_end: newPeriod.end
    }
    setSearchParams(buildURLParams(updatedParams))
  }
  
  const handleIssueFiltersChange = (newFilters: typeof issueFilters) => {
    setIssueFilters(newFilters)
    
    // URLを更新
    const urlFilters: any = {}
    if (newFilters.search) urlFilters.search = newFilters.search
    if (newFilters.milestone) urlFilters.milestone = newFilters.milestone
    if (newFilters.assignee) urlFilters.assignee = newFilters.assignee
    if (newFilters.kanban_status) urlFilters.kanban_status = newFilters.kanban_status
    if (newFilters.service) urlFilters.service = newFilters.service
    if (newFilters.state) urlFilters.state = newFilters.state
    if (newFilters.point_min !== undefined) urlFilters.min_point = newFilters.point_min
    if (newFilters.point_max !== undefined) urlFilters.max_point = newFilters.point_max
    if (newFilters.created_at_from) urlFilters.created_after = newFilters.created_at_from
    if (newFilters.created_at_to) urlFilters.created_before = newFilters.created_at_to
    if (newFilters.completed_at_from) urlFilters.completed_after = newFilters.completed_at_from
    if (newFilters.completed_at_to) urlFilters.completed_before = newFilters.completed_at_to
    if (newFilters.is_epic) urlFilters.is_epic = newFilters.is_epic
    
    const currentParams = Object.fromEntries(searchParams)
    const updatedParams = {
      ...currentParams,
      ...urlFilters
    }
    
    // Remove undefined values
    Object.keys(updatedParams).forEach(key => {
      if (updatedParams[key] === undefined || updatedParams[key] === '') {
        delete updatedParams[key]
      }
    })
    
    setSearchParams(buildURLParams(updatedParams))
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
          <button
            onClick={async () => {
              const shareFilters: any = {
                period_start: state.chartPeriod.start,
                period_end: state.chartPeriod.end
              }
              
              // Add issue filters
              if (issueFilters.search) shareFilters.search = issueFilters.search
              if (issueFilters.milestone) shareFilters.milestone = issueFilters.milestone
              if (issueFilters.assignee) shareFilters.assignee = issueFilters.assignee
              if (issueFilters.kanban_status) shareFilters.kanban_status = issueFilters.kanban_status
              if (issueFilters.service) shareFilters.service = issueFilters.service
              if (issueFilters.state) shareFilters.state = issueFilters.state
              if (issueFilters.point_min !== undefined) shareFilters.min_point = issueFilters.point_min
              if (issueFilters.point_max !== undefined) shareFilters.max_point = issueFilters.point_max
              if (issueFilters.created_at_from) shareFilters.created_after = issueFilters.created_at_from
              if (issueFilters.created_at_to) shareFilters.created_before = issueFilters.created_at_to
              if (issueFilters.completed_at_from) shareFilters.completed_after = issueFilters.completed_at_from
              if (issueFilters.completed_at_to) shareFilters.completed_before = issueFilters.completed_at_to
              if (issueFilters.is_epic) shareFilters.is_epic = issueFilters.is_epic
              
              // Add sort config
              if (sortConfig) {
                shareFilters.sortKey = sortConfig.key
                shareFilters.sortDirection = sortConfig.direction
              }
              
              const shareUrl = generateShareURL(shareFilters, '/dashboard')
              const success = await copyToClipboard(shareUrl)
              if (success) {
                setShowCopiedMessage(true)
                setTimeout(() => setShowCopiedMessage(false), 3000)
              }
            }}
            className="share-btn"
            title="現在のフィルタ条件を含むURLをコピー"
          >
            🔗 URLを共有
          </button>
          {showCopiedMessage && (
            <span className="copied-message">URLをコピーしました！</span>
          )}
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
          onIssueFiltersChange={handleIssueFiltersChange}
          onExportIssues={() => exportIssues('csv')}
        />
        
        <div className="issues-section">
          <IssueTable 
            issues={filteredIssues}
            loading={loading}
            showFilters={false}
            allowShowAll={true}
            initialShowAll={true}
            sortConfig={sortConfig}
            onSortChange={(key, direction) => {
              setSortConfig({ key, direction })
              // URLを更新
              const currentParams = Object.fromEntries(searchParams)
              const updatedParams = {
                ...currentParams,
                sortKey: key,
                sortDirection: direction
              }
              setSearchParams(buildURLParams(updatedParams))
            }}
          />
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { IssueTable } from '../IssueList/IssueTable'
import { IssueFilters } from '../IssueList/IssueFilters'
import { IssueStatistics } from '../IssueList/IssueStatistics'
import { usePBLViewerIssues } from '../../hooks/usePBLViewerIssues'
import { useApp } from '../../contexts/AppContext'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state } = useApp()
  const { issues, loading, fetchAllIssues, exportIssues, hasCachedData } = usePBLViewerIssues()
  const [showStatistics, setShowStatistics] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      // 初回ロード時はキャッシュデータがあるかチェック
      if (isInitialLoad) {
        setIsInitialLoad(false)
        // キャッシュデータがない場合のみAPI呼び出し
        if (!hasCachedData()) {
          // PBL Viewerでは期間フィルタを除外して全issueを取得
          const filtersWithoutPeriod = { ...state.pblViewerFilters }
          delete filtersWithoutPeriod.created_after
          delete filtersWithoutPeriod.created_before
          delete filtersWithoutPeriod.completed_after
          delete filtersWithoutPeriod.quarter
          fetchAllIssues(filtersWithoutPeriod)
        }
      } else {
        // 設定変更時は常にAPI呼び出し（期間フィルタを除外）
        const filtersWithoutPeriod = { ...state.pblViewerFilters }
        delete filtersWithoutPeriod.created_after
        delete filtersWithoutPeriod.created_before
        delete filtersWithoutPeriod.completed_after
        delete filtersWithoutPeriod.quarter
        fetchAllIssues(filtersWithoutPeriod)
      }
    }
  }, [
    state.gitlabConfig.isConnected,
    state.gitlabConfig.url,
    state.gitlabConfig.token,
    state.gitlabConfig.projectId,
    state.pblViewerFilters.milestone,
    state.pblViewerFilters.assignee,
    state.pblViewerFilters.service,
    state.pblViewerFilters.kanban_status,
    state.pblViewerFilters.state,
    state.pblViewerFilters.search,
    state.pblViewerFilters.min_point,
    state.pblViewerFilters.max_point,
    state.pblViewerFilters.quarter,
    isInitialLoad
  ])

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
          {hasCachedData() && !loading && state.pblViewerCacheTimestamp && (
            <span className="cache-indicator" title="データはキャッシュから復元されました">
              📄 {state.pblViewerCacheTimestamp.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {state.pblViewerCacheTimestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}時点
            </span>
          )}
          <button 
            onClick={() => {
              const filtersWithoutPeriod = { ...state.pblViewerFilters }
              delete filtersWithoutPeriod.created_after
              delete filtersWithoutPeriod.created_before
              delete filtersWithoutPeriod.completed_after
              delete filtersWithoutPeriod.quarter
              fetchAllIssues(filtersWithoutPeriod)
            }}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? '読み込み中...' : 'データ再取得'}
          </button>
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
          <IssueFilters useFetchAll={true} />
        </div>
        
        <div className="issues-section">
          {!loading && issues.length === 0 && state.gitlabConfig.isConnected && (
            <div className="no-issues-message">
              <p>イシューが見つかりません。フィルターを確認するか、上部の「データ再取得」ボタンを押してください。</p>
            </div>
          )}
          <IssueTable 
            issues={issues}
            loading={loading}
            showFilters={false}
            pageSize={50}
            allowShowAll={true}
            initialShowAll={true}
          />
        </div>
      </div>
    </div>
  )
}
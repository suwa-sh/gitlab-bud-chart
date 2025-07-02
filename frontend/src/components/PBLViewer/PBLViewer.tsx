import { useState, useEffect } from 'react'
import { IssueTable } from '../IssueList/IssueTable'
import { IssueFilters } from '../IssueList/IssueFilters'
import { IssueStatistics } from '../IssueList/IssueStatistics'
import { useIssues } from '../../hooks/useIssues'
import { useApp } from '../../contexts/AppContext'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state } = useApp()
  const { issues, loading, fetchIssues, exportIssues, hasCachedData } = useIssues()
  const [showStatistics, setShowStatistics] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    if (state.gitlabConfig.isConnected) {
      // 初回ロード時はキャッシュデータがあるかチェック
      if (isInitialLoad) {
        setIsInitialLoad(false)
        // キャッシュデータがない場合のみAPI呼び出し
        if (!hasCachedData()) {
          fetchIssues(state.filters)
        }
      } else {
        // 設定変更時は常にAPI呼び出し
        fetchIssues(state.filters)
      }
    }
  }, [
    state.gitlabConfig.isConnected,
    state.gitlabConfig.url,
    state.gitlabConfig.token,
    state.gitlabConfig.projectId,
    state.filters, 
    fetchIssues,
    hasCachedData,
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
          {hasCachedData() && !loading && (
            <span className="cache-indicator" title="データはキャッシュから復元されました">
              📄 キャッシュデータ
            </span>
          )}
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
          {!loading && issues.length === 0 && state.gitlabConfig.isConnected && (
            <div className="no-issues-message">
              <p>イシューが見つかりません。フィルターを確認するか、データを再取得してください。</p>
              <button 
                onClick={() => fetchIssues(state.filters)}
                className="refresh-btn"
              >
                データを再取得
              </button>
            </div>
          )}
          <IssueTable 
            issues={issues}
            loading={loading}
            showFilters={false}
            pageSize={50}
            allowShowAll={true}
          />
        </div>
      </div>
    </div>
  )
}
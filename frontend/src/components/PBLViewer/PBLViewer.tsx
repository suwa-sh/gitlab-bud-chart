import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { IssueTable } from '../IssueList/IssueTable'
import { PBLStatistics } from './PBLStatistics'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { PBLFilters } from './PBLFilters'
import { usePBLViewerIssues } from '../../hooks/usePBLViewerIssues'
import { useApp } from '../../contexts/AppContext'
import {
  parseURLParams,
  generateShareURL,
  copyToClipboard,
} from '../../utils/urlUtils'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state, dispatch } = useApp()
  const { issues, loading, fetchAllIssues, exportIssues, hasCachedData } =
    usePBLViewerIssues()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showEditConfig, setShowEditConfig] = useState(false)
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // URLパラメータから初期値を読み込み
  useEffect(() => {
    const urlFilters = parseURLParams(searchParams)

    // URLからフィルタを復元
    if (Object.keys(urlFilters).length > 0) {
      const { sortKey, sortDirection, ...filters } = urlFilters
      dispatch({ type: 'SET_PBL_VIEWER_FILTERS', payload: filters })

      // ソート設定を復元
      if (sortKey && sortDirection) {
        setSortConfig({ key: sortKey, direction: sortDirection })
      }
    }
  }, [])

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
    isInitialLoad,
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
    if (state.pblViewerError?.includes('セッションが期限切れ')) {
      setShowEditConfig(true)
    }
  }, [state.pblViewerError])

  if (!state.gitlabConfig.isConnected || showEditConfig) {
    return (
      <div className="pbl-viewer">
        <h1>Product Backlog Viewer</h1>
        <GitLabConfig
          editMode={showEditConfig}
          onConfigured={() => {
            setShowEditConfig(false)
            // 設定変更後に強制的にIssuesを再取得
            if (state.gitlabConfig.isConnected) {
              const filtersWithoutPeriod = { ...state.pblViewerFilters }
              delete filtersWithoutPeriod.created_after
              delete filtersWithoutPeriod.created_before
              delete filtersWithoutPeriod.completed_after
              delete filtersWithoutPeriod.quarter
              fetchAllIssues(filtersWithoutPeriod)
            }
          }}
          onCancel={showEditConfig ? () => setShowEditConfig(false) : undefined}
        />
      </div>
    )
  }

  return (
    <div className="pbl-viewer">
      <header className="pbl-header">
        <h1>Product Backlog Viewer</h1>
        <div className="pbl-controls">
          {hasCachedData() && !loading && state.pblViewerCacheTimestamp && (
            <span
              className="cache-indicator"
              title="データはキャッシュから復元されました"
            >
              📄{' '}
              {state.pblViewerCacheTimestamp.toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
              })}{' '}
              {state.pblViewerCacheTimestamp.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              時点
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
            onClick={() => exportIssues('csv')}
            disabled={loading || issues.length === 0}
            className="export-btn"
          >
            CSV エクスポート
          </button>
          <button
            onClick={async () => {
              const shareFilters = {
                ...state.pblViewerFilters,
                ...(sortConfig && {
                  sortKey: sortConfig.key,
                  sortDirection: sortConfig.direction,
                }),
              }
              const shareUrl = generateShareURL(shareFilters, '/pbl-viewer')
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
        </div>
      </header>

      <div className="pbl-content">
        <div className="statistics-section">
          <PBLStatistics issues={issues} />
        </div>

        <div className="filters-section">
          <PBLFilters issues={issues} />
        </div>

        <div className="issues-section">
          {!loading &&
            issues.length === 0 &&
            state.gitlabConfig.isConnected && (
              <div className="no-issues-message">
                <p>
                  イシューが見つかりません。フィルターを確認するか、上部の「データ再取得」ボタンを押してください。
                </p>
              </div>
            )}
          <IssueTable
            issues={issues}
            loading={loading}
            showFilters={false}
            pageSize={50}
            allowShowAll={true}
            initialShowAll={true}
            sortConfig={sortConfig}
            onSortChange={(key, direction) => {
              setSortConfig({ key, direction })
              // URLを更新
              const newFilters = {
                ...state.pblViewerFilters,
                sortKey: key,
                sortDirection: direction,
              }
              const shareUrl = generateShareURL(newFilters, '/pbl-viewer')
              navigate(shareUrl.replace(window.location.origin, ''))
            }}
          />
        </div>
      </div>
    </div>
  )
}

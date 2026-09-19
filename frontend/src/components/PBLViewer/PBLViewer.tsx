import { useState, useEffect, useMemo, useRef } from 'react'
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
import { filterIssues } from '../../utils/filterUtils'
import { EMPTY_PBL_FILTERS } from '../../utils/pblFilters'
import { LoadingSpinner } from '../Common/LoadingSpinner'
import './PBLViewer.css'

export const PBLViewer = () => {
  const { state, dispatch } = useApp()
  const { issues, loading, fetchAllIssues, exportIssues, hasCachedData } =
    usePBLViewerIssues()
  const isInitialLoadRef = useRef(true)
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
      // reducerは既存値にマージするため、URLに無いキーは明示的に空へ戻す
      // （保存済みの別フィルタが混ざり、共有URLの条件と表示が食い違うのを防ぐ）
      dispatch({
        type: 'SET_PBL_VIEWER_FILTERS',
        payload: { ...EMPTY_PBL_FILTERS, ...filters },
      })

      // ソート設定を復元
      if (sortKey && sortDirection) {
        setSortConfig({ key: sortKey, direction: sortDirection })
      }
    }
  }, [])

  // issueの取得は接続設定の変更時のみ。フィルタ変更では再取得せず、クライアント側で絞り込む
  useEffect(() => {
    if (!state.gitlabConfig.isConnected) return

    const isInitialLoad = isInitialLoadRef.current
    isInitialLoadRef.current = false
    // 初回ロード時は、キャッシュデータがあればAPI呼び出しを省略
    if (isInitialLoad && hasCachedData()) return

    fetchAllIssues().catch((error) =>
      console.error('Issue取得に失敗しました:', error),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.gitlabConfig.isConnected,
    state.gitlabConfig.url,
    state.gitlabConfig.token,
    state.gitlabConfig.projectId,
  ])

  // 取得済みの全issueにフィルタを適用（PBL ViewerのフィルタキーをfilterIssuesの形式に合わせる）
  const filteredIssues = useMemo(() => {
    const f = state.pblViewerFilters
    return filterIssues(issues, {
      search: f.search,
      milestone: f.milestone,
      assignee: f.assignee,
      kanban_status: f.kanban_status,
      service: f.service,
      state: f.state,
      point_min: f.min_point,
      point_max: f.max_point,
      created_at_from: f.created_after,
      created_at_to: f.created_before,
      completed_at_from: f.completed_after,
      completed_at_to: f.completed_before,
      is_epic: f.is_epic,
      quarter: f.quarter,
    })
  }, [issues, state.pblViewerFilters])

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
              fetchAllIssues().catch((error) =>
                console.error('Issue取得に失敗しました:', error),
              )
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
              fetchAllIssues().catch((error) =>
                console.error('Issue取得に失敗しました:', error),
              )
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

      {/* プリローダーはページで1つだけ表示する */}
      {loading && <LoadingSpinner />}

      <div className="pbl-content">
        <div className="statistics-section">
          <PBLStatistics issues={filteredIssues} />
        </div>

        <div className="filters-section">
          {/* 選択肢はフィルタ適用前の全issueから作る（絞り込むと他の選択肢が消えるのを防ぐ） */}
          <PBLFilters issues={issues} />
        </div>

        <div className="issues-section">
          {!loading &&
            filteredIssues.length === 0 &&
            state.gitlabConfig.isConnected && (
              <div className="no-issues-message">
                <p>
                  イシューが見つかりません。フィルターを確認するか、上部の「データ再取得」ボタンを押してください。
                </p>
              </div>
            )}
          <IssueTable
            issues={filteredIssues}
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

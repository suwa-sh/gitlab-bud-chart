import React, { useState } from 'react'
import { ExcludedIssue } from '../../utils/issueFilters'
import './ExcludedIssuesWarning.css'

interface Props {
  excludedIssues: ExcludedIssue[]
  gitlabUrl: string
  projectId: string
  projectNamespace?: string
}

export const ExcludedIssuesWarning: React.FC<Props> = ({ 
  excludedIssues, 
  gitlabUrl, 
  projectId,
  projectNamespace
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // デバッグログ
  console.log('[ExcludedIssuesWarning] Props received:', {
    excludedIssuesCount: excludedIssues.length,
    excludedIssues,
    gitlabUrl,
    projectId
  })
  
  // 除外理由の詳細を表示
  if (excludedIssues.length > 0) {
    console.log('[ExcludedIssuesWarning] Excluded issues details:')
    excludedIssues.forEach((excluded, index) => {
      console.log(`  [${index}] reason: ${excluded.reason}, issue:`, {
        iid: excluded.issue.iid,
        title: excluded.issue.title,
        completed_at: excluded.issue.completed_at,
        state: excluded.issue.state,
        kanban_status: excluded.issue.kanban_status
      })
    })
  }
  
  // 期間前完了・期間後完了・Due date未設定・期間後作成のIssueをフィルタ
  const prePeriodIssues = excludedIssues.filter(e => e.reason === 'pre-period')
  const postPeriodIssues = excludedIssues.filter(e => e.reason === 'post-period')
  const noDueDateIssues = excludedIssues.filter(e => e.reason === 'no-due-date')
  const createdAfterPeriodIssues = excludedIssues.filter(e => e.reason === 'created-after-period')
  
  const warningIssues = [...prePeriodIssues, ...postPeriodIssues, ...noDueDateIssues, ...createdAfterPeriodIssues]
  
  console.log('[ExcludedIssuesWarning] Filtered issues:', {
    prePeriodCount: prePeriodIssues.length,
    postPeriodCount: postPeriodIssues.length,
    noDueDateCount: noDueDateIssues.length,
    createdAfterPeriodCount: createdAfterPeriodIssues.length,
    warningIssuesCount: warningIssues.length
  })
  
  if (warningIssues.length === 0) {
    return null
  }
  
  const getIssueUrl = (iid: number) => {
    // projectNamespaceが利用可能な場合はそれを使用、そうでなければprojectIdにフォールバック
    const projectPath = projectNamespace || projectId
    return `${gitlabUrl}/${projectPath}/-/issues/${iid}`
  }
  
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ja-JP')
  }
  
  return (
    <div className="excluded-issues-warning">
      <div className="warning-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="warning-icon">⚠️</span>
        <span className="warning-title">
          データ不整合の可能性があるIssue（{warningIssues.length}件）
        </span>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="warning-content">
          {prePeriodIssues.length > 0 && (
            <div className="excluded-section">
              <h4>期間前完了（{prePeriodIssues.length}件）</h4>
              <div className="excluded-issues-list">
                {prePeriodIssues.map(({ issue }) => (
                  <div key={issue.id} className="excluded-issue-item">
                    <a 
                      href={getIssueUrl(issue.iid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      #{issue.iid}: {issue.title}
                    </a>
                    <span className="issue-date">
                      （{formatDate(issue.completed_at)}完了）
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {postPeriodIssues.length > 0 && (
            <div className="excluded-section">
              <h4>期間後完了（{postPeriodIssues.length}件）</h4>
              <div className="excluded-issues-list">
                {postPeriodIssues.map(({ issue }) => (
                  <div key={issue.id} className="excluded-issue-item">
                    <a 
                      href={getIssueUrl(issue.iid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      #{issue.iid}: {issue.title}
                    </a>
                    <span className="issue-date">
                      （{formatDate(issue.completed_at)}完了）
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {noDueDateIssues.length > 0 && (
            <div className="excluded-section">
              <h4>Due Date未設定（{noDueDateIssues.length}件）</h4>
              <p className="warning-description">
                「完了」または「共有待ち」ステータスですが、Due Dateが設定されていません
              </p>
              <div className="excluded-issues-list">
                {noDueDateIssues.map(({ issue }) => (
                  <div key={issue.id} className="excluded-issue-item">
                    <a 
                      href={getIssueUrl(issue.iid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      #{issue.iid}: {issue.title}
                    </a>
                    <span className="issue-status">
                      （ステータス: {issue.kanban_status}）
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {createdAfterPeriodIssues.length > 0 && (
            <div className="excluded-section">
              <h4>期間後作成（{createdAfterPeriodIssues.length}件）</h4>
              <p className="warning-description">
                期間終了日より後に作成されたIssueです
              </p>
              <div className="excluded-issues-list">
                {createdAfterPeriodIssues.map(({ issue }) => (
                  <div key={issue.id} className="excluded-issue-item">
                    <a 
                      href={getIssueUrl(issue.iid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      #{issue.iid}: {issue.title}
                    </a>
                    <span className="issue-date">
                      （作成日: {formatDate(issue.created_at)}）
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
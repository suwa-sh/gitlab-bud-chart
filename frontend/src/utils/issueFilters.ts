import { Issue } from '../types/api'
import { getOverlappingQuarters, normalizeQuarterLabel } from './quarterUtils'

// Unified exclusion rules for issues
export const EXCLUDED_KANBAN_STATUSES = [
  '#テンプレート',
  '#ゴール/アナウンス',
  '#不要'
]

export interface ExcludedIssue {
  issue: Issue
  reason: 'quarter' | 'pre-period' | 'post-period' | 'template' | 'unnecessary' | 'goal' | 'no-due-date' | 'created-after-period'
}

export interface ScopeFilterResult {
  filtered: Issue[]
  excluded: ExcludedIssue[]
}

/**
 * 四半期フィルタを適用
 */
export const applyQuarterFilter = (
  issues: Issue[], 
  startDate: string, 
  endDate: string
): ScopeFilterResult => {
  const targetQuarters = getOverlappingQuarters(startDate, endDate)
  const normalizedTargetQuarters = targetQuarters.map(normalizeQuarterLabel)
  const filtered: Issue[] = []
  const excluded: ExcludedIssue[] = []
  
  issues.forEach(issue => {
    const normalizedIssueQuarter = normalizeQuarterLabel(issue.quarter || '')
    if (!normalizedIssueQuarter || !normalizedTargetQuarters.includes(normalizedIssueQuarter)) {
      excluded.push({ issue, reason: 'quarter' })
    } else {
      filtered.push(issue)
    }
  })
  
  return { filtered, excluded }
}

export const applyExclusionFilter = (issues: Issue[]): ScopeFilterResult => {
  const filtered: Issue[] = []
  const excluded: ExcludedIssue[] = []
  
  issues.forEach(issue => {
    const kanbanStatus = issue.kanban_status || ''
    if (kanbanStatus === '#テンプレート') {
      excluded.push({ issue, reason: 'template' })
    } else if (kanbanStatus === '#ゴール/アナウンス') {
      excluded.push({ issue, reason: 'goal' })
    } else if (kanbanStatus === '#不要') {
      excluded.push({ issue, reason: 'unnecessary' })
    } else {
      filtered.push(issue)
    }
  })
  
  return { filtered, excluded }
}

export const applyDateCorrection = (issue: Issue, startDate?: string): Issue => {
  let correctedIssue = { ...issue }
  
  // If created_at > completed_at, adjust created_at to match completed_at
  if (issue.completed_at && issue.created_at > issue.completed_at) {
    correctedIssue.created_at = issue.completed_at
  }
  
  // If created_at < start_date, adjust created_at to match start_date
  if (startDate && correctedIssue.created_at < startDate) {
    correctedIssue.created_at = startDate
  }
  
  return correctedIssue
}

/**
 * スコープ判定を適用（期間前完了・期間後完了を除外）
 */
export const applyScopeRules = (
  issues: Issue[], 
  startDate: string, 
  endDate: string
): ScopeFilterResult => {
  const filtered: Issue[] = []
  const excluded: ExcludedIssue[] = []
  
  issues.forEach(issue => {
    if (issue.completed_at) {
      // 期間後完了チェック
      if (issue.completed_at > endDate) {
        excluded.push({ issue, reason: 'post-period' })
        return
      }
      // 期間前完了チェック
      if (issue.completed_at < startDate) {
        excluded.push({ issue, reason: 'pre-period' })
        return
      }
    }
    // 除外条件に該当しない（未完了または期間内完了）
    filtered.push(issue)
  })
  
  return { filtered, excluded }
}

/**
 * Due date未設定の完了Issue検出
 */
export const applyNoDueDateCheck = (issues: Issue[]): ScopeFilterResult => {
  const filtered: Issue[] = []
  const excluded: ExcludedIssue[] = []
  
  issues.forEach(issue => {
    // kanban_statusが「完了」「共有待ち」でdue_dateがない場合
    if (issue.kanban_status && 
        ['完了', '共有待ち'].includes(issue.kanban_status) && 
        !issue.due_date) {
      excluded.push({ issue, reason: 'no-due-date' })
    } else {
      filtered.push(issue)
    }
  })
  
  return { filtered, excluded }
}

/**
 * 統合スコープフィルタ
 * 処理順序:
 * 1. 四半期フィルタ
 * 2. 統一フィルタ（テンプレート等除外）
 * 3. 日付補正
 * 4. スコープ判定（期間前後完了除外）
 * 5. Due date未設定の完了Issue検出（警告用）
 */
export const applyScopeFilters = (
  issues: Issue[], 
  startDate: string, 
  endDate: string
): ScopeFilterResult => {
  const allExcluded: ExcludedIssue[] = []
  
  // 1. 四半期フィルタ
  const quarterResult = applyQuarterFilter(issues, startDate, endDate)
  allExcluded.push(...quarterResult.excluded)
  
  // 2. 統一フィルタ
  const exclusionResult = applyExclusionFilter(quarterResult.filtered)
  allExcluded.push(...exclusionResult.excluded)
  
  // 3. 日付補正
  const correctedIssues = exclusionResult.filtered.map(issue => 
    applyDateCorrection(issue, startDate)
  )
  
  // 4. スコープ判定
  const scopeResult = applyScopeRules(correctedIssues, startDate, endDate)
  allExcluded.push(...scopeResult.excluded)
  
  // 5. Due date未設定の完了Issue検出（警告用）
  const noDueDateResult = applyNoDueDateCheck(scopeResult.filtered)
  allExcluded.push(...noDueDateResult.excluded)
  
  return {
    filtered: noDueDateResult.filtered,
    excluded: allExcluded
  }
}

// 後方互換性のため既存関数も残す
export const applyUnifiedFilters = (issues: Issue[], startDate?: string): Issue[] => {
  // First apply exclusion filter
  const filteredIssues = issues.filter(issue => 
    !EXCLUDED_KANBAN_STATUSES.includes(issue.kanban_status || '')
  )
  
  // Then apply date correction to each issue
  return filteredIssues.map(issue => applyDateCorrection(issue, startDate))
}
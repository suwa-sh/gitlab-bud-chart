import { Issue } from '../types/api'

// Unified exclusion rules for issues
export const EXCLUDED_KANBAN_STATUSES = [
  '#テンプレート',
  '#ゴール/アナウンス',
  '#不要'
]

export const applyExclusionFilter = (issues: Issue[]): Issue[] => {
  return issues.filter(issue => !EXCLUDED_KANBAN_STATUSES.includes(issue.kanban_status || ''))
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

export const applyUnifiedFilters = (issues: Issue[], startDate?: string): Issue[] => {
  // First apply exclusion filter
  const filteredIssues = applyExclusionFilter(issues)
  
  // Then apply date correction to each issue
  return filteredIssues.map(issue => applyDateCorrection(issue, startDate))
}
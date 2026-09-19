import { Issue } from '../types/api'

export interface IssueFilters {
  search?: string
  milestone?: string
  assignee?: string
  kanban_status?: string
  service?: string
  state?: string
  point_min?: number
  point_max?: number
  created_at_from?: string
  created_at_to?: string
  completed_at_from?: string
  completed_at_to?: string
  is_epic?: string
  quarter?: string
}

export const filterIssues = (
  issues: Issue[],
  filters: IssueFilters,
): Issue[] => {
  return issues.filter((issue) => {
    // テキスト検索フィルタ - バックエンドと同じくタイトルと説明文を対象にする
    if (filters.search) {
      const keyword = filters.search.toLowerCase()
      const inTitle = issue.title.toLowerCase().includes(keyword)
      const inDescription = (issue.description || '')
        .toLowerCase()
        .includes(keyword)
      if (!inTitle && !inDescription) {
        return false
      }
    }

    // Milestoneフィルタ
    if (filters.milestone && issue.milestone !== filters.milestone) {
      return false
    }

    // Assigneeフィルタ
    if (filters.assignee && issue.assignee !== filters.assignee) {
      return false
    }

    // Kanban Statusフィルタ
    if (
      filters.kanban_status &&
      issue.kanban_status !== filters.kanban_status
    ) {
      return false
    }

    // Serviceフィルタ
    if (filters.service && issue.service !== filters.service) {
      return false
    }

    // Stateフィルタ - バックエンドと同じく 'all' は絞り込みなしとして扱う
    if (
      filters.state &&
      filters.state !== 'all' &&
      issue.state !== filters.state
    ) {
      return false
    }

    // Quarterフィルタ
    if (filters.quarter && issue.quarter !== filters.quarter) {
      return false
    }

    // Pointフィルタ (範囲) - バックエンドと同じくpoint未設定のissueは除外する
    if (
      filters.point_min !== undefined &&
      (issue.point == null || issue.point < filters.point_min)
    ) {
      return false
    }
    if (
      filters.point_max !== undefined &&
      (issue.point == null || issue.point > filters.point_max)
    ) {
      return false
    }

    // Created Atフィルタ (日付範囲)
    if (filters.created_at_from && issue.created_at) {
      const issueDate = new Date(issue.created_at).toISOString().split('T')[0]
      if (issueDate < filters.created_at_from) {
        return false
      }
    }
    if (filters.created_at_to && issue.created_at) {
      const issueDate = new Date(issue.created_at).toISOString().split('T')[0]
      if (issueDate > filters.created_at_to) {
        return false
      }
    }

    // Completed Atフィルタ (日付範囲) - バックエンドと同じく、開始日指定時は未完了issueを除外する
    if (filters.completed_at_from && !issue.completed_at) {
      return false
    }
    if (filters.completed_at_from && issue.completed_at) {
      const issueDate = new Date(issue.completed_at).toISOString().split('T')[0]
      if (issueDate < filters.completed_at_from) {
        return false
      }
    }
    if (filters.completed_at_to && issue.completed_at) {
      const issueDate = new Date(issue.completed_at).toISOString().split('T')[0]
      if (issueDate > filters.completed_at_to) {
        return false
      }
    }

    // Epicフィルタ
    if (filters.is_epic && filters.is_epic !== '') {
      if (filters.is_epic === 'epic' && !issue.is_epic) {
        return false
      }
      if (filters.is_epic === 'normal' && issue.is_epic) {
        return false
      }
    }

    return true
  })
}

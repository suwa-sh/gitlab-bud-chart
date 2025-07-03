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
}

export const filterIssues = (issues: Issue[], filters: IssueFilters): Issue[] => {
  return issues.filter(issue => {
    // Title検索フィルタ
    if (filters.search && 
        !issue.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
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
    if (filters.kanban_status && issue.kanban_status !== filters.kanban_status) {
      return false
    }
    
    // Serviceフィルタ
    if (filters.service && issue.service !== filters.service) {
      return false
    }
    
    // Stateフィルタ
    if (filters.state && issue.state !== filters.state) {
      return false
    }
    
    // Pointフィルタ (範囲)
    if (filters.point_min !== undefined && issue.point !== undefined && issue.point < filters.point_min) {
      return false
    }
    if (filters.point_max !== undefined && issue.point !== undefined && issue.point > filters.point_max) {
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
    
    // Completed Atフィルタ (日付範囲)
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
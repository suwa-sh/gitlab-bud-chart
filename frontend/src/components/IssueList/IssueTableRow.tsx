import { Issue } from '../../types/api'
import { useApp } from '../../contexts/AppContext'

interface IssueTableRowProps {
  issue: Issue
}

export const IssueTableRow = ({ issue }: IssueTableRowProps) => {
  const { state } = useApp()
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const getKanbanBadgeClass = (status?: string) => {
    if (!status) return 'kanban-badge'
    switch (status.toLowerCase()) {
      case 'working':
      case '作業中':
        return 'kanban-badge working'
      case 'completed':
      case '完了':
        return 'kanban-badge completed'
      case 'blocked':
      case 'ブロック':
        return 'kanban-badge blocked'
      default:
        return 'kanban-badge'
    }
  }

  const getStateBadgeClass = (state: string) => {
    switch (state.toLowerCase()) {
      case 'opened':
      case 'open':
        return 'state-badge opened'
      case 'closed':
        return 'state-badge closed'
      default:
        return 'state-badge'
    }
  }

  const getGitLabIssueUrl = (issueIid: number) => {
    const { gitlabConfig } = state
    if (gitlabConfig.url && gitlabConfig.projectNamespace) {
      return `${gitlabConfig.url}/${gitlabConfig.projectNamespace}/-/issues/${issueIid}`
    }
    // Fallback to hash URL if GitLab config is not available
    return `#/issue/${issueIid}`
  }

  return (
    <tr>
      <td>{issue.service || '-'}</td>
      <td>{issue.milestone || '-'}</td>
      <td>
        {issue.is_epic ? (
          <span className="epic-badge" title="Epic Issue">📋</span>
        ) : '-'}
      </td>
      <td>
        <a 
          href={getGitLabIssueUrl(issue.iid)} 
          className="issue-title"
          title={issue.description}
          target="_blank"
          rel="noopener noreferrer"
        >
          {issue.title}
        </a>
      </td>
      <td>
        {issue.point ? (
          <span className="point-badge">{issue.point}</span>
        ) : '-'}
      </td>
      <td>
        <span className={getKanbanBadgeClass(issue.kanban_status)}>
          {issue.kanban_status || '-'}
        </span>
      </td>
      <td>{issue.assignee || '-'}</td>
      <td>
        {issue.quarter ? (
          <span className="quarter-badge">{issue.quarter}</span>
        ) : '-'}
      </td>
      <td>{formatDate(issue.created_at)}</td>
      <td>{formatDate(issue.completed_at)}</td>
      <td>
        <span className={getStateBadgeClass(issue.state)}>
          {issue.state}
        </span>
      </td>
    </tr>
  )
}
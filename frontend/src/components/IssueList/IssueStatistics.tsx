import { useMemo } from 'react'
import { Issue } from '../../types/api'

interface IssueStatisticsProps {
  issues: Issue[]
}

export const IssueStatistics = ({ issues }: IssueStatisticsProps) => {
  const statistics = useMemo(() => {
    const total = issues.length
    const opened = issues.filter(i => i.state === 'opened' || i.state === 'open').length
    const closed = issues.filter(i => i.state === 'closed').length
    
    const totalPoints = issues.reduce((sum, issue) => sum + (issue.point || 0), 0)
    const completedPoints = issues
      .filter(i => i.state === 'closed')
      .reduce((sum, issue) => sum + (issue.point || 0), 0)
    
    const milestoneBreakdown = issues.reduce((acc, issue) => {
      const milestone = issue.milestone || '未設定'
      acc[milestone] = (acc[milestone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const serviceBreakdown = issues.reduce((acc, issue) => {
      const service = issue.service || '未設定'
      acc[service] = (acc[service] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const kanbanBreakdown = issues.reduce((acc, issue) => {
      const status = issue.kanban_status || '未設定'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      opened,
      closed,
      totalPoints,
      completedPoints,
      completionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      pointCompletionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      milestoneBreakdown,
      serviceBreakdown,
      kanbanBreakdown
    }
  }, [issues])

  return (
    <div className="issue-statistics">
      <h3>統計情報</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h4>総数</h4>
          <div className="stat-value">{statistics.total}</div>
          <div className="stat-breakdown">
            <span className="stat-item opened">Open: {statistics.opened}</span>
            <span className="stat-item closed">Closed: {statistics.closed}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <h4>ポイント</h4>
          <div className="stat-value">{statistics.totalPoints}</div>
          <div className="stat-breakdown">
            <span className="stat-item">完了: {statistics.completedPoints}</span>
            <span className="stat-item">進捗: {statistics.pointCompletionRate}%</span>
          </div>
        </div>
        
        <div className="stat-card">
          <h4>完了率</h4>
          <div className="stat-value">{statistics.completionRate}%</div>
          <div className="stat-progress">
            <div 
              className="stat-progress-bar" 
              style={{ width: `${statistics.completionRate}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="breakdown-section">
        <div className="breakdown-card">
          <h5>マイルストーン別</h5>
          <div className="breakdown-list">
            {Object.entries(statistics.milestoneBreakdown).map(([milestone, count]) => (
              <div key={milestone} className="breakdown-item">
                <span className="breakdown-label">{milestone}</span>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="breakdown-card">
          <h5>サービス別</h5>
          <div className="breakdown-list">
            {Object.entries(statistics.serviceBreakdown).map(([service, count]) => (
              <div key={service} className="breakdown-item">
                <span className="breakdown-label">{service}</span>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="breakdown-card">
          <h5>ステータス別</h5>
          <div className="breakdown-list">
            {Object.entries(statistics.kanbanBreakdown).map(([status, count]) => (
              <div key={status} className="breakdown-item">
                <span className="breakdown-label">{status}</span>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
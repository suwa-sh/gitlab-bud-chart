import { useState, useMemo } from 'react'
import { Issue } from '../../types/api'

interface PBLStatisticsProps {
  issues: Issue[]
}

export const PBLStatistics = ({ issues }: PBLStatisticsProps) => {
  const [showStatistics, setShowStatistics] = useState(true)
  const [showDetailedStats, setShowDetailedStats] = useState(false)

  const statistics = useMemo(() => {
    const total = issues.length
    const closed = issues.filter(i => i.completed_at).length
    
    const totalPoints = issues.reduce((sum, issue) => sum + (issue.point || 0), 0)
    const completedPoints = issues
      .filter(i => i.completed_at)
      .reduce((sum, issue) => sum + (issue.point || 0), 0)
    
    // 詳細統計の計算
    const serviceBreakdown = issues.reduce((acc, issue) => {
      const service = issue.service || '未設定'
      acc[service] = (acc[service] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const milestoneBreakdown = issues.reduce((acc, issue) => {
      const milestone = issue.milestone || '未設定'
      acc[milestone] = (acc[milestone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const epicBreakdown = issues.reduce((acc, issue) => {
      const epic = issue.is_epic ? 'Epic' : '通常'
      acc[epic] = (acc[epic] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const kanbanBreakdown = issues.reduce((acc, issue) => {
      const status = issue.kanban_status || '未設定'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const assigneeBreakdown = issues.reduce((acc, issue) => {
      const assignee = issue.assignee || '未割当'
      acc[assignee] = (acc[assignee] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const quarterBreakdown = issues.reduce((acc, issue) => {
      const quarter = issue.quarter || '未設定'
      acc[quarter] = (acc[quarter] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const stateBreakdown = issues.reduce((acc, issue) => {
      const state = issue.state === 'opened' || issue.state === 'open' ? 'Open' : 
                   issue.state === 'closed' ? 'Closed' : issue.state || '未設定'
      acc[state] = (acc[state] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      closed,
      totalPoints,
      completedPoints,
      completionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      pointCompletionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      serviceBreakdown,
      milestoneBreakdown,
      epicBreakdown,
      kanbanBreakdown,
      assigneeBreakdown,
      quarterBreakdown,
      stateBreakdown
    }
  }, [issues])

  const toggleStatistics = () => {
    setShowStatistics(!showStatistics)
  }

  const toggleDetailedStats = () => {
    setShowDetailedStats(!showDetailedStats)
  }

  const breakdownSections = [
    { key: 'service', title: 'Service', data: statistics.serviceBreakdown },
    { key: 'milestone', title: 'Milestone', data: statistics.milestoneBreakdown },
    { key: 'epic', title: 'Epic', data: statistics.epicBreakdown },
    { key: 'kanban', title: 'Kanban Status', data: statistics.kanbanBreakdown },
    { key: 'assignee', title: 'Assignee', data: statistics.assigneeBreakdown },
    { key: 'quarter', title: 'Quarter', data: statistics.quarterBreakdown },
    { key: 'state', title: 'State', data: statistics.stateBreakdown }
  ]

  return (
    <div className="pbl-statistics">
      <button 
        className="statistics-toggle"
        onClick={toggleStatistics}
      >
        <span className="statistics-title">統計情報</span>
        <span className={`expand-icon ${showStatistics ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      
      {showStatistics && (
        <>
          {/* メイン統計カード */}
          <div className="main-stats">
            <div className="stat-card">
              <h4>issue件数</h4>
              <div className="stat-value">{statistics.total}</div>
            </div>
            
            <div className="stat-card">
              <h4>総ポイント数</h4>
              <div className="stat-value">{statistics.totalPoints}</div>
            </div>
            
            <div className="stat-card">
              <h4>完了ポイント</h4>
              <div className="stat-value">{statistics.completedPoints}</div>
            </div>
            
            <div className="stat-card">
              <h4>完了率</h4>
              <div className="stat-value">{statistics.pointCompletionRate}%</div>
              <div className="stat-progress">
                <div 
                  className="stat-progress-bar" 
                  style={{ width: `${statistics.pointCompletionRate}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 詳細統計（展開可能） */}
          <div className="detailed-breakdown">
            <button 
              className="detailed-stats-toggle"
              onClick={toggleDetailedStats}
            >
              <span className="detailed-stats-title">詳細統計</span>
              <span className={`expand-icon ${showDetailedStats ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>
            
            {showDetailedStats && (
              <div className="breakdown-grid">
                {breakdownSections.map(section => {
                  const hasData = Object.keys(section.data).length > 0
                  
                  if (!hasData) return null
                  
                  return (
                    <div key={section.key} className="breakdown-section">
                      <div className="breakdown-header">
                        <span className="breakdown-title">{section.title}</span>
                        <span className="breakdown-count-badge">
                          {Object.keys(section.data).length}
                        </span>
                      </div>
                      
                      <div className="breakdown-content">
                        {Object.entries(section.data)
                          .sort(([,a], [,b]) => b - a) // 降順でソート
                          .map(([key, count]) => (
                            <div key={key} className="breakdown-item">
                              <span className="breakdown-label">{key}</span>
                              <span className="breakdown-count">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
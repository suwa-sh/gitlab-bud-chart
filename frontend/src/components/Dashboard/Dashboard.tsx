import { useState, useEffect } from 'react'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { gitlabApi } from '../../services/api'

export const Dashboard = () => {
  const [isConfigured, setIsConfigured] = useState(false)
  const [sampleIssues, setSampleIssues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkGitLabStatus()
  }, [])

  const checkGitLabStatus = async () => {
    setIsLoading(true)
    try {
      const status = await gitlabApi.getStatus()
      setIsConfigured(status.connected)
      
      if (status.connected) {
        const issues = await gitlabApi.getSampleIssues()
        setSampleIssues(issues.issues)
      }
    } catch (err) {
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigured = () => {
    setIsConfigured(true)
    checkGitLabStatus()
  }

  if (isLoading) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <div className="loading">接続状態を確認中...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {!isConfigured ? (
        <GitLabConfig onConfigured={handleConfigured} />
      ) : (
        <>
          <div className="config-section">
            <p>✅ GitLab接続済み</p>
            <button onClick={() => setIsConfigured(false)}>設定変更</button>
          </div>
          
          <div className="period-section">
            <p>Period: 2025-04 ~ 2025-06</p>
          </div>
          
          <div className="charts-section">
            <div className="chart-container">
              <h2>Burn Down</h2>
              <div className="chart-placeholder">Chart will be here</div>
            </div>
            
            <div className="chart-container">
              <h2>Burn Up</h2>
              <div className="chart-placeholder">Chart will be here</div>
            </div>
          </div>
          
          <div className="issues-section">
            <h2>Issues (Sample Data from GitLab)</h2>
            {sampleIssues.length > 0 ? (
              <table className="issues-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>State</th>
                    <th>Assignee</th>
                    <th>Milestone</th>
                    <th>Labels</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>{issue.id}</td>
                      <td>{issue.title}</td>
                      <td>
                        <span className={`state-badge ${issue.state}`}>
                          {issue.state}
                        </span>
                      </td>
                      <td>{issue.assignee || '-'}</td>
                      <td>{issue.milestone || '-'}</td>
                      <td>
                        {issue.labels.length > 0 ? (
                          <div className="labels">
                            {issue.labels.map((label: string, idx: number) => (
                              <span key={idx} className="label-tag">
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Issueが見つかりませんでした。</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
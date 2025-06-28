export const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="config-section">
        <p>GitLab Config: http://localhost:8080/project/team</p>
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
        <h2>Issues</h2>
        <table className="issues-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Title</th>
              <th>Point</th>
              <th>Kanban Status</th>
              <th>Assignee</th>
              <th>Created At</th>
              <th>Completed At</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>v1.0</td>
              <td>Issue1</td>
              <td>1.0</td>
              <td>作業中</td>
              <td>user1</td>
              <td>2024-01-01</td>
              <td>-</td>
              <td>Open</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
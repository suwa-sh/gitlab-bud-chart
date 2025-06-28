export const PBLViewer = () => {
  return (
    <div className="pbl-viewer">
      <h1>PBL Viewer</h1>
      <div className="issues-section">
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
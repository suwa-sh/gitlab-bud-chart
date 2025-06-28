import { Issue } from '../../types/api'

interface ChartSectionProps {
  period: {
    start: string
    end: string
  }
  issues: Issue[]
  loading: boolean
}

export const ChartSection = ({ period, issues, loading }: ChartSectionProps) => {
  if (loading) {
    return (
      <div className="charts-section">
        <div className="chart-container">
          <h2>Burn Down</h2>
          <div className="chart-placeholder">読み込み中...</div>
        </div>
        
        <div className="chart-container">
          <h2>Burn Up</h2>
          <div className="chart-placeholder">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="charts-section">
      <div className="chart-container">
        <h2>Burn Down</h2>
        <div className="chart-placeholder">
          <p>Chart will be here</p>
          <small>期間: {period.start} 〜 {period.end}</small>
          <small>Issues: {issues.length}件</small>
        </div>
      </div>
      
      <div className="chart-container">
        <h2>Burn Up</h2>
        <div className="chart-placeholder">
          <p>Chart will be here</p>
          <small>期間: {period.start} 〜 {period.end}</small>
          <small>Issues: {issues.length}件</small>
        </div>
      </div>
    </div>
  )
}
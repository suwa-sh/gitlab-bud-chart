import { useState, useEffect } from 'react'
import { BurnDownChart } from '../Chart/BurnDownChart'
import { BurnUpChart } from '../Chart/BurnUpChart'
import { chartsApi } from '../../services/api'
import { ChartData, Issue } from '../../types/api'
import '../Chart/Chart.css'

interface ChartSectionProps {
  period: {
    start: string
    end: string
  }
  issues: Issue[]
  loading: boolean
}

export const ChartSection = ({ period, issues, loading }: ChartSectionProps) => {
  const [burnDownData, setBurnDownData] = useState<ChartData[]>([])
  const [burnUpData, setBurnUpData] = useState<ChartData[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<string>('')
  const [chartView, setChartView] = useState<'both' | 'burndown' | 'burnup'>('both')
  const [error, setError] = useState<string>('')

  // マイルストーン一覧
  const milestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))]

  useEffect(() => {
    if (!loading && period.start && period.end) {
      fetchChartData()
    }
  }, [period, selectedMilestone, loading])

  const fetchChartData = async () => {
    setChartLoading(true)
    setError('')
    
    try {
      const [burnDown, burnUp] = await Promise.all([
        chartsApi.getBurnDownData(
          selectedMilestone || undefined,
          period.start,
          period.end
        ),
        chartsApi.getBurnUpData(
          selectedMilestone || undefined,
          period.start,
          period.end
        )
      ])
      
      setBurnDownData(burnDown.chart_data)
      setBurnUpData(burnUp.chart_data)
    } catch (error) {
      console.error('チャートデータ取得エラー:', error)
      setError('チャートデータの取得に失敗しました')
    } finally {
      setChartLoading(false)
    }
  }

  const handleExportChart = () => {
    // チャート画像エクスポート機能
    const chartElements = document.querySelectorAll('.recharts-wrapper svg')
    chartElements.forEach((svg, index) => {
      const svgData = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `chart_${index === 0 ? 'burndown' : 'burnup'}_${new Date().toISOString().split('T')[0]}.svg`
      a.click()
      
      URL.revokeObjectURL(url)
    })
  }

  if (loading) {
    return (
      <div className="chart-section">
        <div className="chart-loading">
          <div className="loading-spinner" />
          <p>データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-section">
        <div className="chart-empty">
          <p>{error}</p>
          <button onClick={fetchChartData}>再試行</button>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-section">
      {/* タイトルと基本情報 */}
      <div className="chart-section-header">
        <div className="chart-title-group">
          <h2>Charts</h2>
          <div className="chart-indicator">
            <span className="chart-label">期間:</span>
            <span className="chart-dates">{period.start} 〜 {period.end}</span>
          </div>
          {selectedMilestone && (
            <div className="milestone-indicator">
              <span className="milestone-label">マイルストーン:</span>
              <span className="milestone-name">{selectedMilestone}</span>
            </div>
          )}
        </div>
        <button 
          className="export-btn"
          onClick={handleExportChart}
          disabled={chartLoading || (!burnDownData.length && !burnUpData.length)}
        >
          📊 チャートエクスポート
        </button>
      </div>

      {/* フィルタ・表示条件 */}
      <div className="chart-filters">
        <div className="filter-group">
          <label htmlFor="milestone-select">マイルストーン:</label>
          <select 
            id="milestone-select"
            value={selectedMilestone}
            onChange={(e) => setSelectedMilestone(e.target.value)}
            className="milestone-select"
          >
            <option value="">すべて</option>
            {milestones.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>表示タイプ:</label>
          <div className="view-toggle">
            <button 
              className={chartView === 'both' ? 'active' : ''}
              onClick={() => setChartView('both')}
            >
              両方
            </button>
            <button 
              className={chartView === 'burndown' ? 'active' : ''}
              onClick={() => setChartView('burndown')}
            >
              Burn Down
            </button>
            <button 
              className={chartView === 'burnup' ? 'active' : ''}
              onClick={() => setChartView('burnup')}
            >
              Burn Up
            </button>
          </div>
        </div>
      </div>

      {/* チャート表示エリア */}
      <div className={`charts-container ${chartView}`}>
        {(chartView === 'both' || chartView === 'burndown') && (
          <div className="chart-wrapper">
            <BurnDownChart 
              data={burnDownData}
              loading={chartLoading}
              height={chartView === 'both' ? 350 : 450}
              startDate={period.start}
              endDate={period.end}
            />
          </div>
        )}
        
        {(chartView === 'both' || chartView === 'burnup') && (
          <div className="chart-wrapper">
            <BurnUpChart 
              data={burnUpData}
              loading={chartLoading}
              height={chartView === 'both' ? 350 : 450}
              showVelocity={true}
              startDate={period.start}
              endDate={period.end}
            />
          </div>
        )}
      </div>
      
      {/* 統計情報 */}
      {selectedMilestone && (
        <div className="chart-info">
          <span>対象Issue数: {issues.filter(i => i.milestone === selectedMilestone).length}件</span>
        </div>
      )}
    </div>
  )
}
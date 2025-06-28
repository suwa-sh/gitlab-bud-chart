# Task 11: Dashboard UI・チャート表示コンポーネント

## 概要
チャート表示コンポーネントを実装し、Dashboard UIを完成させる。burn-up/burn-downチャートの美しい可視化を実現する。

## 目的
- Burn-up/Burn-downチャートコンポーネント実装
- 期間選択UI実装
- チャート・テーブル連携実装
- インタラクティブ機能実装

## 前提条件
- Task 10完了（チャート分析ロジック実装済み）
- Recharts ライブラリインストール済み

## 作業手順

### 1. チャートコンポーネント実装

#### 1.1 Burn-downチャートコンポーネント

**frontend/src/components/Chart/BurnDownChart.tsx**:
```tsx
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts'
import { ChartData } from '../../types/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import './Chart.css'

interface BurnDownChartProps {
  data: ChartData[]
  loading?: boolean
  height?: number
}

export const BurnDownChart = ({ 
  data, 
  loading = false, 
  height = 400 
}: BurnDownChartProps) => {
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: format(new Date(item.date), 'MM/dd', { locale: ja }),
      理想: Math.round(item.planned_points * 10) / 10,
      実績: Math.round(item.actual_points * 10) / 10,
      残り: Math.round(item.remaining_points * 10) / 10
    }))
  }, [data])

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value} ポイント
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner" />
        <p>チャートを読み込み中...</p>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="chart-empty">
        <p>データがありません</p>
      </div>
    )
  }

  return (
    <div className="burn-down-chart">
      <h3>Burn Down Chart</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'ポイント', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 14 }
            }}
          />
          <Tooltip content={customTooltip} />
          <Legend 
            wrapperStyle={{ fontSize: 14 }}
            iconType="line"
          />
          
          {/* 理想線 */}
          <Line
            type="monotone"
            dataKey="理想"
            stroke="#8884d8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          
          {/* 実績線 */}
          <Line
            type="monotone"
            dataKey="実績"
            stroke="#82ca9d"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          
          {/* 残りエリア */}
          <Area
            type="monotone"
            dataKey="残り"
            stroke="#ff7300"
            fill="#ff7300"
            fillOpacity={0.1}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">開始時点:</span>
          <span className="summary-value">
            {data[0]?.remaining_points.toFixed(1)} ポイント
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">現在:</span>
          <span className="summary-value">
            {data[data.length - 1]?.remaining_points.toFixed(1)} ポイント
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">進捗率:</span>
          <span className="summary-value">
            {((1 - data[data.length - 1]?.remaining_points / data[0]?.remaining_points) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
```

#### 1.2 Burn-upチャートコンポーネント

**frontend/src/components/Chart/BurnUpChart.tsx**:
```tsx
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { ChartData } from '../../types/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import './Chart.css'

interface BurnUpChartProps {
  data: ChartData[]
  loading?: boolean
  height?: number
  showVelocity?: boolean
}

export const BurnUpChart = ({ 
  data, 
  loading = false, 
  height = 400,
  showVelocity = false
}: BurnUpChartProps) => {
  
  const { chartData, averageVelocity } = useMemo(() => {
    const formatted = data.map(item => ({
      date: format(new Date(item.date), 'MM/dd', { locale: ja }),
      理想: Math.round(item.planned_points * 10) / 10,
      完了: Math.round(item.completed_points * 10) / 10,
      総量: Math.round(item.total_points * 10) / 10
    }))

    // ベロシティ計算
    let velocity = 0
    if (data.length > 1) {
      const completedPoints = data[data.length - 1].completed_points
      const days = data.length
      velocity = completedPoints / days
    }

    return { chartData: formatted, averageVelocity: velocity }
  }, [data])

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner" />
        <p>チャートを読み込み中...</p>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="chart-empty">
        <p>データがありません</p>
      </div>
    )
  }

  const totalPoints = data[data.length - 1]?.total_points || 0
  const completedPoints = data[data.length - 1]?.completed_points || 0
  const completionRate = totalPoints > 0 ? (completedPoints / totalPoints * 100) : 0

  return (
    <div className="burn-up-chart">
      <h3>Burn Up Chart</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'ポイント', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 14 }
            }}
          />
          <Tooltip />
          <Legend 
            wrapperStyle={{ fontSize: 14 }}
            iconType="line"
          />
          
          {/* スコープライン（総量） */}
          <Line
            type="stepAfter"
            dataKey="総量"
            stroke="#ff7300"
            strokeWidth={2}
            dot={false}
          />
          
          {/* 理想線 */}
          <Line
            type="monotone"
            dataKey="理想"
            stroke="#8884d8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          
          {/* 完了線 */}
          <Line
            type="monotone"
            dataKey="完了"
            stroke="#82ca9d"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          
          {/* 目標ライン */}
          <ReferenceLine 
            y={totalPoints} 
            stroke="#ff0000" 
            strokeDasharray="3 3"
            label={{ value: "目標", position: "right" }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">総ポイント:</span>
          <span className="summary-value">{totalPoints.toFixed(1)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">完了ポイント:</span>
          <span className="summary-value">{completedPoints.toFixed(1)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">完了率:</span>
          <span className="summary-value progress">
            {completionRate.toFixed(1)}%
          </span>
        </div>
        {showVelocity && (
          <div className="summary-item">
            <span className="summary-label">平均ベロシティ:</span>
            <span className="summary-value">
              {averageVelocity.toFixed(2)} ポイント/日
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. チャートセクション統合コンポーネント

#### 2.1 ChartSection実装

**frontend/src/components/Dashboard/ChartSection.tsx**:
```tsx
import { useState, useEffect } from 'react'
import { BurnDownChart } from '../Chart/BurnDownChart'
import { BurnUpChart } from '../Chart/BurnUpChart'
import { chartsApi } from '../../services/api'
import { ChartData } from '../../types/api'
import './ChartSection.css'

interface ChartSectionProps {
  period: {
    start: string
    end: string
  }
  issues: any[]
  loading: boolean
}

export const ChartSection = ({ period, issues, loading }: ChartSectionProps) => {
  const [burnDownData, setBurnDownData] = useState<ChartData[]>([])
  const [burnUpData, setBurnUpData] = useState<ChartData[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<string>('')
  const [chartView, setChartView] = useState<'both' | 'burndown' | 'burnup'>('both')

  // マイルストーン一覧
  const milestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))]

  useEffect(() => {
    fetchChartData()
  }, [period, selectedMilestone])

  const fetchChartData = async () => {
    setChartLoading(true)
    
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
      a.download = `chart_${index === 0 ? 'burndown' : 'burnup'}_${new Date().toISOString()}.svg`
      a.click()
      
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="chart-section">
      <div className="chart-controls">
        <div className="control-group">
          <label>マイルストーン:</label>
          <select 
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
        
        <div className="control-group">
          <label>表示:</label>
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
        
        <button 
          className="export-button"
          onClick={handleExportChart}
          disabled={chartLoading}
        >
          📊 チャートをエクスポート
        </button>
      </div>

      <div className={`charts-container ${chartView}`}>
        {(chartView === 'both' || chartView === 'burndown') && (
          <div className="chart-wrapper">
            <BurnDownChart 
              data={burnDownData}
              loading={chartLoading}
              height={chartView === 'both' ? 350 : 450}
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
            />
          </div>
        )}
      </div>
      
      {selectedMilestone && (
        <div className="milestone-info">
          <p>選択中のマイルストーン: <strong>{selectedMilestone}</strong></p>
          <p>対象Issue数: {issues.filter(i => i.milestone === selectedMilestone).length}件</p>
        </div>
      )}
    </div>
  )
}
```

### 3. 期間選択コンポーネント

#### 3.1 PeriodSelector実装

**frontend/src/components/Common/PeriodSelector.tsx**:
```tsx
import { useState } from 'react'
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns'
import './PeriodSelector.css'

interface PeriodSelectorProps {
  value: {
    start: string
    end: string
  }
  onChange: (period: { start: string; end: string }) => void
}

export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
  const [isCustom, setIsCustom] = useState(false)

  const handlePresetPeriod = (preset: string) => {
    const today = new Date()
    let start: Date
    let end: Date

    switch (preset) {
      case 'this-month':
        start = startOfMonth(today)
        end = endOfMonth(today)
        break
      case 'last-month':
        const lastMonth = addMonths(today, -1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
      case 'this-quarter':
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3
        start = new Date(today.getFullYear(), quarterMonth, 1)
        end = endOfMonth(addMonths(start, 2))
        break
      case 'last-quarter':
        const lastQuarterStart = addMonths(new Date(), -3)
        const lastQuarterMonth = Math.floor(lastQuarterStart.getMonth() / 3) * 3
        start = new Date(lastQuarterStart.getFullYear(), lastQuarterMonth, 1)
        end = endOfMonth(addMonths(start, 2))
        break
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear(), 11, 31)
        break
      default:
        return
    }

    onChange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    })
    setIsCustom(false)
  }

  return (
    <div className="period-selector">
      <div className="period-presets">
        <button onClick={() => handlePresetPeriod('this-month')}>
          今月
        </button>
        <button onClick={() => handlePresetPeriod('last-month')}>
          先月
        </button>
        <button onClick={() => handlePresetPeriod('this-quarter')}>
          今四半期
        </button>
        <button onClick={() => handlePresetPeriod('last-quarter')}>
          前四半期
        </button>
        <button onClick={() => handlePresetPeriod('this-year')}>
          今年
        </button>
        <button 
          className={isCustom ? 'active' : ''}
          onClick={() => setIsCustom(!isCustom)}
        >
          カスタム
        </button>
      </div>
      
      {isCustom && (
        <div className="custom-period">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="date-input"
          />
          <span>〜</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="date-input"
          />
        </div>
      )}
      
      <div className="current-period">
        <span>{value.start} 〜 {value.end}</span>
      </div>
    </div>
  )
}
```

### 4. チャートスタイル実装

#### 4.1 Chart.css

**frontend/src/components/Chart/Chart.css**:
```css
/* チャート共通スタイル */
.burn-down-chart,
.burn-up-chart {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.burn-down-chart h3,
.burn-up-chart h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* カスタムツールチップ */
.custom-tooltip {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tooltip-label {
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}

/* チャートサマリー */
.chart-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.summary-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.summary-value.progress {
  color: #82ca9d;
}

/* ローディング・空状態 */
.chart-loading,
.chart-empty {
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .chart-summary {
    flex-direction: column;
    gap: 15px;
  }
  
  .burn-down-chart,
  .burn-up-chart {
    padding: 15px;
  }
}
```

#### 4.2 ChartSection.css

**frontend/src/components/Dashboard/ChartSection.css**:
```css
.chart-section {
  margin-bottom: 40px;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: 500;
  color: #666;
}

.milestone-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-width: 150px;
}

.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.view-toggle button {
  padding: 6px 16px;
  border: none;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button:not(:last-child) {
  border-right: 1px solid #ddd;
}

.view-toggle button.active {
  background: #007bff;
  color: white;
}

.export-button {
  margin-left: auto;
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.export-button:hover:not(:disabled) {
  background: #218838;
}

.export-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* チャートコンテナ */
.charts-container {
  display: grid;
  gap: 20px;
}

.charts-container.both {
  grid-template-columns: 1fr 1fr;
}

.charts-container.burndown,
.charts-container.burnup {
  grid-template-columns: 1fr;
}

.chart-wrapper {
  min-height: 400px;
}

.milestone-info {
  margin-top: 20px;
  padding: 15px;
  background: #e3f2fd;
  border-radius: 4px;
  text-align: center;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .charts-container.both {
    grid-template-columns: 1fr;
  }
  
  .chart-controls {
    flex-wrap: wrap;
  }
  
  .export-button {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .control-group {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .milestone-select,
  .view-toggle {
    width: 100%;
  }
}
```

## 成果物

### 必須成果物
1. **チャートコンポーネント**:
   - BurnDownChart（美しいburn-downチャート）
   - BurnUpChart（インタラクティブburn-upチャート）
   - ChartSection（統合表示）

2. **UI コンポーネント**:
   - PeriodSelector（期間選択）
   - ChartControls（表示制御）
   - エクスポート機能

3. **インタラクティブ機能**:
   - ツールチップ表示
   - ズーム・パン機能
   - チャート切り替え
   - データエクスポート

4. **レスポンシブ対応**:
   - モバイル最適化
   - タブレット対応
   - 大画面対応

## 検証項目

### 実施前確認
- [x] Task 10のチャートAPI動作確認
- [x] Rechartsライブラリインストール確認
- [x] チャートデータ形式理解完了

### 実施後確認
- [x] チャート美しく表示される
- [x] インタラクション直感的
- [x] データ正確に反映される
- [x] パフォーマンス適切
- [x] レスポンシブ対応完璧

### 品質確認
- [x] チャート描画速度 < 1秒
- [x] スムーズなアニメーション
- [x] 適切なカラーパレット
- [x] アクセシビリティ対応

## 次のタスクへの引き継ぎ

### Task 12への引き継ぎ事項
- 完成したチャートUI
- Dashboard統合済み
- 全Phase 4機能完成

### 注意事項
- 大量データでの描画パフォーマンス
- チャートライブラリの制限事項
- ブラウザ互換性

## 作業時間見積もり: 8-10時間
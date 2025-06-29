import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { ChartData } from '../../types/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { calculateBusinessDayIdealLineForBurnUp } from '../../utils/businessDays'
import './Chart.css'

interface BurnUpChartProps {
  data: ChartData[]
  loading?: boolean
  height?: number
  showVelocity?: boolean
  startDate?: string
  endDate?: string
}

export const BurnUpChart = ({ 
  data, 
  loading = false, 
  height = 400,
  showVelocity = false,
  startDate,
  endDate
}: BurnUpChartProps) => {
  
  const { chartData, averageVelocity } = useMemo(() => {
    let formatted
    
    if (!data.length || !startDate || !endDate) {
      // Fallback to original calculation if dates not available
      formatted = data.map(item => ({
        date: format(new Date(item.date), 'MM/dd', { locale: ja }),
        理想: Math.round(item.planned_points * 10) / 10,
        完了: Math.round(item.completed_points * 10) / 10,
        総量: Math.round(item.total_points * 10) / 10
      }))
    } else {
      // Calculate business day aware ideal line for burn up
      const totalPoints = data[data.length - 1]?.total_points || 0
      const chartDates = data.map(item => item.date)
      const businessDayIdealLine = calculateBusinessDayIdealLineForBurnUp(
        totalPoints,
        startDate,
        endDate,
        chartDates
      )

      formatted = data.map((item, index) => ({
        date: format(new Date(item.date), 'MM/dd', { locale: ja }),
        理想: Math.round(businessDayIdealLine[index] * 10) / 10,
        完了: Math.round(item.completed_points * 10) / 10,
        総量: Math.round(item.total_points * 10) / 10
      }))
    }

    // ベロシティ計算
    let velocity = 0
    if (data.length > 1) {
      const completedPoints = data[data.length - 1].completed_points
      const days = data.length
      velocity = completedPoints / days
    }

    return { chartData: formatted, averageVelocity: velocity }
  }, [data, startDate, endDate])

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
          <Tooltip content={customTooltip} />
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
          {totalPoints > 0 && (
            <ReferenceLine 
              y={totalPoints} 
              stroke="#ff0000" 
              strokeDasharray="3 3"
              label={{ value: "目標", position: "right" }}
            />
          )}
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
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
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
            {data[0]?.remaining_points > 0 
              ? ((1 - data[data.length - 1]?.remaining_points / data[0]?.remaining_points) * 100).toFixed(1)
              : '0.0'
            }%
          </span>
        </div>
      </div>
    </div>
  )
}
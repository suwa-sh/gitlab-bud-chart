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
  startDate?: string
  endDate?: string
}

export const BurnUpChart = ({ 
  data, 
  loading = false, 
  height = 400,
  startDate,
  endDate
}: BurnUpChartProps) => {
  // Calculate dynamic height based on screen size
  const dynamicHeight = useMemo(() => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth >= 2000) return Math.max(height, 500);
      if (screenWidth >= 1600) return Math.max(height, 450);
      if (screenWidth >= 1200) return Math.max(height, 420);
    }
    return height;
  }, [height]);
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY EARLY RETURNS
  const chartData = useMemo(() => {
    if (!data.length || !startDate || !endDate) {
      // Fallback to original calculation if dates not available
      return data.map(item => ({
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

      return data.map((item, index) => ({
        date: format(new Date(item.date), 'MM/dd', { locale: ja }),
        理想: Math.round(businessDayIdealLine[index] * 10) / 10,
        完了: Math.round(item.completed_points * 10) / 10,
        総量: Math.round(item.total_points * 10) / 10
      }))
    }
  }, [data, startDate, endDate])

  // Reference line data - calculate using useMemo to ensure consistent hook order
  const totalPoints = useMemo(() => {
    return data[data.length - 1]?.total_points || 0
  }, [data])

  // EARLY RETURNS AFTER ALL HOOKS
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

  // Tooltip function must be defined after early returns but before JSX
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

  return (
    <div className="burn-up-chart">
      <h3>Burn Up Chart</h3>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
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
      
    </div>
  )
}
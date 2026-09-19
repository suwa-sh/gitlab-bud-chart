import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ChartData } from '../../types/api'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { calculateBusinessDayIdealLine } from '../../utils/businessDays'
import { calculateProjection } from '../../utils/chartProjection'
import './Chart.css'

interface BurnDownChartProps {
  data: ChartData[]
  height?: number
  startDate?: string
  endDate?: string
}

const round1 = (value: number) => Math.round(value * 10) / 10

export const BurnDownChart = ({
  data,
  height = 400,
  startDate,
  endDate,
}: BurnDownChartProps) => {
  // Calculate dynamic height based on screen size
  const dynamicHeight = useMemo(() => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      if (screenWidth >= 2000) return Math.max(height, 500)
      if (screenWidth >= 1600) return Math.max(height, 450)
      if (screenWidth >= 1200) return Math.max(height, 420)
    }
    return height
  }, [height])

  const projection = useMemo(() => calculateProjection(data), [data])

  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY EARLY RETURNS
  const chartData = useMemo(() => {
    const totalPoints = data[0]?.total_points || 0
    // Calculate business day aware ideal line
    const idealLine =
      data.length && startDate && endDate
        ? calculateBusinessDayIdealLine(
            totalPoints,
            startDate,
            endDate,
            data.map((item) => item.date),
          )
        : data.map((item) => item.planned_points)

    return data.map((item, index) => {
      const trendCompleted = projection.trendCompleted[index]
      return {
        date: format(new Date(item.date), 'MM/dd', { locale: ja }),
        理想: round1(idealLine[index]),
        // 当日より後の実績は未確定のため表示しない
        残ポイント:
          index <= projection.todayIndex ? round1(item.actual_points) : null,
        現在のペース:
          trendCompleted === null
            ? null
            : round1(Math.max(0, totalPoints - trendCompleted)),
      }
    })
  }, [data, startDate, endDate, projection])

  // EARLY RETURNS AFTER ALL HOOKS
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
          {payload
            .filter(
              (entry: any) => entry.value !== null && entry.value !== undefined,
            )
            .map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value} ポイント
              </p>
            ))}
        </div>
      )
    }
    return null
  }

  const todayLabel =
    projection.todayIndex >= 0 && projection.todayIndex < data.length - 1
      ? chartData[projection.todayIndex].date
      : null

  return (
    <div className="burn-down-chart">
      <h3>Burn Down Chart</h3>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
              style: { fontSize: 14 },
            }}
          />
          <Tooltip content={customTooltip} />
          <Legend wrapperStyle={{ fontSize: 14 }} iconType="line" />

          {/* 当日 */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="#999"
              strokeDasharray="2 2"
              label={{ value: '今日', position: 'top', fontSize: 12 }}
            />
          )}

          {/* 理想線 */}
          <Line
            type="monotone"
            dataKey="理想"
            stroke="#8884d8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={false}
          />

          {/* 残ポイント線（当日まで） */}
          <Line
            type="monotone"
            dataKey="残ポイント"
            stroke="#82ca9d"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 5 }}
          />

          {/* 現在のペースの直線（開始時点と当日の実績を結び、期間終了まで延長） */}
          <Line
            type="linear"
            dataKey="現在のペース"
            stroke="#2e8b57"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

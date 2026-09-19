import { format } from 'date-fns'
import { ChartData } from '../types/api'

export interface ChartProjection {
  /** 当日以前で最後のデータのindex。期間開始前は -1 */
  todayIndex: number
  /** ペース直線の傾き（1日あたりの完了ポイント） */
  slopePerDay: number
  /**
   * ペース直線上の完了ポイント。期間開始時点と当日の実績を結び、期間終了まで延ばした直線。
   * 当日より右側が「このままのペースで進んだ場合」の見込みになる。期間開始前は全て null
   */
  trendCompleted: (number | null)[]
  /** 直線が総ポイントに到達する日（YYYY-MM-DD）。期間内に到達しない場合は null */
  finishDate: string | null
  /** 期間終了時点の見込み残ポイント。見込み対象の未来日がない場合は null */
  projectedRemainingAtEnd: number | null
}

const toDateKey = (date: string): string => date.slice(0, 10)

/**
 * 期間開始時点と当日の実績を結ぶ直線（現在のペース）を計算する
 */
export const calculateProjection = (
  data: ChartData[],
  today: Date = new Date(),
): ChartProjection => {
  const empty: ChartProjection = {
    todayIndex: -1,
    slopePerDay: 0,
    trendCompleted: data.map(() => null),
    finishDate: null,
    projectedRemainingAtEnd: null,
  }
  if (!data.length) return empty

  const todayKey = format(today, 'yyyy-MM-dd')
  let todayIndex = -1
  data.forEach((item, index) => {
    if (toDateKey(item.date) <= todayKey) todayIndex = index
  })
  if (todayIndex < 0) return empty

  const startCompleted = data[0].completed_points
  const completedToday = data[todayIndex].completed_points
  const totalPoints = data[data.length - 1].total_points
  const slopePerDay =
    todayIndex > 0 ? (completedToday - startCompleted) / todayIndex : 0

  let finishDate: string | null = null
  const trendCompleted = data.map((item, index) => {
    // 総ポイントを超える部分は頭打ちにする（完了後は進まない）
    const value = Math.min(totalPoints, startCompleted + slopePerDay * index)
    if (
      !finishDate &&
      index >= todayIndex &&
      totalPoints > 0 &&
      value >= totalPoints
    ) {
      finishDate = toDateKey(item.date)
    }
    return value
  })

  const hasFuture = todayIndex < data.length - 1
  return {
    todayIndex,
    slopePerDay,
    trendCompleted,
    finishDate: hasFuture ? finishDate : null,
    projectedRemainingAtEnd: hasFuture
      ? Math.max(0, totalPoints - (trendCompleted[data.length - 1] ?? 0))
      : null,
  }
}

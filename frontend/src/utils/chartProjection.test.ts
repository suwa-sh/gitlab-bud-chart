import { describe, it, expect } from 'vitest'
import { calculateProjection } from './chartProjection'
import { ChartData } from '../types/api'

// 2025-06-01 から始まる期間。index がそのまま開始日からの経過日数になる
const buildData = (completedByDay: number[], totalPoints = 20): ChartData[] =>
  completedByDay.map((completed, index) => ({
    date: `2025-06-${String(index + 1).padStart(2, '0')}`,
    planned_points: 0,
    actual_points: totalPoints - completed,
    remaining_points: totalPoints - completed,
    completed_points: completed,
    total_points: totalPoints,
    completed_issues: 0,
    total_issues: 0,
  }))

// 11日間。当日(6/5, index 4)までに8pt完了。途中の実績は直線から外れている
const data = buildData([0, 0, 5, 5, 8, 8, 8, 8, 8, 8, 8])
const today = new Date(2025, 5, 5)

describe('calculateProjection', () => {
  it('傾きは期間開始時点と当日の実績を結んだ値になる', () => {
    const result = calculateProjection(data, today)
    expect(result.todayIndex).toBe(4)
    expect(result.slopePerDay).toBe(2)
  })

  it('直線は期間全体に引かれ、開始時点と当日の実績点を通る', () => {
    const result = calculateProjection(data, today)
    expect(result.trendCompleted[0]).toBe(0)
    expect(result.trendCompleted[4]).toBe(8)
    expect(result.trendCompleted.every((v) => v !== null)).toBe(true)
  })

  it('等間隔で増える完全な直線になる（土日でも横ばいにならない）', () => {
    const result = calculateProjection(data, today)
    expect(result.trendCompleted.slice(0, 10)).toEqual([
      0, 2, 4, 6, 8, 10, 12, 14, 16, 18,
    ])
  })

  it('総ポイントに到達する日を完了見込み日として返す', () => {
    const result = calculateProjection(data, today)
    expect(result.trendCompleted[10]).toBe(20)
    expect(result.finishDate).toBe('2025-06-11')
    expect(result.projectedRemainingAtEnd).toBe(0)
  })

  it('ペースが足りない場合は完了見込みなしとし、期末の残ポイントを返す', () => {
    // 4日で4pt → 1pt/日。期末(index 10)で10pt / 20pt
    const slow = buildData([0, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4])
    const result = calculateProjection(slow, today)
    expect(result.finishDate).toBeNull()
    expect(result.projectedRemainingAtEnd).toBe(10)
  })

  it('直線は総ポイントで頭打ちになる', () => {
    // 4日で16pt → 4pt/日。index 5 で20ptに到達
    const fast = buildData([0, 4, 8, 12, 16, 16, 16, 16, 16, 16, 16])
    const result = calculateProjection(fast, today)
    expect(result.trendCompleted.slice(5)).toEqual([20, 20, 20, 20, 20, 20])
    expect(result.finishDate).toBe('2025-06-06')
  })

  it('開始日に完了済みのポイントがあれば、そこを起点にする', () => {
    const offset = buildData([4, 4, 6, 6, 8, 8, 8, 8, 8, 8, 8])
    const result = calculateProjection(offset, today)
    expect(result.slopePerDay).toBe(1)
    expect(result.trendCompleted[0]).toBe(4)
    expect(result.trendCompleted[10]).toBe(14)
  })

  it('期間初日は傾きを計算できないため横ばいにする', () => {
    const result = calculateProjection(data, new Date(2025, 5, 1))
    expect(result.todayIndex).toBe(0)
    expect(result.slopePerDay).toBe(0)
  })

  it('期間開始前は直線を出さない', () => {
    const result = calculateProjection(data, new Date(2025, 4, 30))
    expect(result.todayIndex).toBe(-1)
    expect(result.trendCompleted.every((v) => v === null)).toBe(true)
    expect(result.projectedRemainingAtEnd).toBeNull()
  })

  it('期間終了後は直線のみ出し、完了見込みは出さない', () => {
    const result = calculateProjection(data, new Date(2025, 6, 1))
    expect(result.todayIndex).toBe(data.length - 1)
    expect(result.trendCompleted[data.length - 1]).toBe(8)
    expect(result.finishDate).toBeNull()
    expect(result.projectedRemainingAtEnd).toBeNull()
  })

  it('データが空でも例外にならない', () => {
    const result = calculateProjection([], today)
    expect(result.todayIndex).toBe(-1)
    expect(result.trendCompleted).toEqual([])
  })
})

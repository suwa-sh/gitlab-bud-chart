import { Issue } from '../types/api'

export interface IssueSortConfig {
  key: string
  direction: 'asc' | 'desc'
}

/**
 * issue を指定キーで並べ替える。値が無い issue は昇順・降順どちらでも末尾に置く。
 * テーブル表示と CSV エクスポートで同じ並びにするため、両方からこの関数を使う
 */
export const sortIssues = (
  issues: Issue[],
  sortConfig: IssueSortConfig | null | undefined,
): Issue[] => {
  if (!sortConfig) return issues

  return [...issues].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof Issue]
    const bValue = b[sortConfig.key as keyof Issue]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })
}

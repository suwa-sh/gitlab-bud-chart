import { useCallback, useMemo } from 'react'
import { Issue, ChartData } from '../types/api'

export const usePerformance = () => {
  // メモ化による再計算防止
  const optimizeIssueList = useCallback((issues: Issue[]) => {
    // 大量データ処理の最適化
    if (issues.length > 1000) {
      // 仮想化のための最適化
      return issues.slice(0, 1000) // 初期表示は1000件まで
    }
    
    // 不要なプロパティを削除してメモリ使用量を削減
    return issues.map(issue => ({
      ...issue,
      // 大きなフィールドは必要な場合のみ保持
      description: issue.description ? issue.description.substring(0, 500) : undefined
    }))
  }, [])
  
  // チャートデータ最適化
  const optimizeChartData = useCallback((chartData: ChartData[]) => {
    // データ点数が多い場合は間引き
    if (chartData.length > 100) {
      const step = Math.floor(chartData.length / 100)
      return chartData.filter((_, index) => index % step === 0)
    }
    
    return chartData
  }, [])
  
  // 検索結果の最適化
  const optimizeSearchResults = useCallback((issues: Issue[], searchTerm: string) => {
    if (!searchTerm) return issues
    
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    // 効率的な検索アルゴリズム
    return issues.filter(issue => {
      // タイトルでの完全一致を優先
      if (issue.title.toLowerCase().includes(lowerSearchTerm)) {
        return true
      }
      
      // ラベルでの部分一致
      if (issue.labels.some(label => label.toLowerCase().includes(lowerSearchTerm))) {
        return true
      }
      
      // 最後に説明での部分一致（計算コストが高いため最後）
      if (issue.description?.toLowerCase().includes(lowerSearchTerm)) {
        return true
      }
      
      return false
    })
  }, [])
  
  // フィルタリング最適化
  const optimizeFiltering = useCallback((issues: Issue[], filters: any) => {
    // フィルタが空の場合は早期リターン
    if (!filters || Object.keys(filters).length === 0) {
      return issues
    }
    
    return issues.filter(issue => {
      // 各フィルタ条件を効率的にチェック
      if (filters.milestone && issue.milestone !== filters.milestone) {
        return false
      }
      
      if (filters.assignee && issue.assignee !== filters.assignee) {
        return false
      }
      
      if (filters.state && issue.state !== filters.state) {
        return false
      }
      
      if (filters.service && issue.service !== filters.service) {
        return false
      }
      
      if (filters.kanban_status && issue.kanban_status !== filters.kanban_status) {
        return false
      }
      
      // ポイント範囲フィルタ
      if (filters.min_point !== undefined && (issue.point || 0) < filters.min_point) {
        return false
      }
      
      if (filters.max_point !== undefined && (issue.point || 0) > filters.max_point) {
        return false
      }
      
      return true
    })
  }, [])
  
  // ソート最適化
  const optimizeSorting = useCallback((issues: Issue[], sortBy: string, sortOrder: 'asc' | 'desc') => {
    if (!sortBy) return issues
    
    return [...issues].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'updated_at':
          aValue = a.updated_at ? new Date(a.updated_at).getTime() : 0
          bValue = b.updated_at ? new Date(b.updated_at).getTime() : 0
          break
        case 'story_points':
          aValue = a.point || 0
          bValue = b.point || 0
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        default:
          return 0
      }
      
      const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortOrder === 'desc' ? -result : result
    })
  }, [])
  
  // 統計計算の最適化
  const optimizeStatistics = useMemo(() => {
    return (issues: Issue[]) => {
      const stats = {
        total: issues.length,
        completed: 0,
        in_progress: 0,
        todo: 0,
        total_points: 0,
        completed_points: 0,
        by_service: {} as Record<string, number>,
        by_assignee: {} as Record<string, number>
      }
      
      // 一度のループで全統計を計算
      issues.forEach(issue => {
        // ステータス別カウント
        switch (issue.kanban_status) {
          case '#完了':
            stats.completed++
            stats.completed_points += issue.point || 0
            break
          case '#作業中':
            stats.in_progress++
            break
          default:
            stats.todo++
        }
        
        // ポイント合計
        stats.total_points += issue.point || 0
        
        // サービス別カウント
        if (issue.service) {
          stats.by_service[issue.service] = (stats.by_service[issue.service] || 0) + 1
        }
        
        // 担当者別カウント
        if (issue.assignee) {
          stats.by_assignee[issue.assignee] = (stats.by_assignee[issue.assignee] || 0) + 1
        }
      })
      
      return stats
    }
  }, [])
  
  // パフォーマンス監視
  const measurePerformance = useCallback((operation: string, fn: () => any) => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    console.log(`Performance: ${operation} took ${end - start} milliseconds`)
    
    return result
  }, [])
  
  return {
    optimizeIssueList,
    optimizeChartData,
    optimizeSearchResults,
    optimizeFiltering,
    optimizeSorting,
    optimizeStatistics,
    measurePerformance
  }
}
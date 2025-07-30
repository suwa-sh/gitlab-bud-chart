import { useState, useEffect, useMemo } from 'react'
import { BurnDownChart } from '../Chart/BurnDownChart'
import { BurnUpChart } from '../Chart/BurnUpChart'
import { PeriodSelector } from '../Common/PeriodSelector'
import { chartsApi } from '../../services/api'
import { ChartData, Issue } from '../../types/api'
import { getOverlappingQuarters } from '../../utils/quarterUtils'
import '../Chart/Chart.css'

interface ChartSectionProps {
  period: {
    start: string
    end: string
  }
  issues: Issue[]
  loading: boolean
  onPeriodChange: (period: { start: string; end: string }) => void
  issueFilters?: {
    search: string
    milestone: string
    assignee: string
    kanban_status: string
    service: string
    state: string
    point_min?: number
    point_max?: number
    created_at_from: string
    created_at_to: string
    completed_at_from: string
    completed_at_to: string
    is_epic: string
  }
  onIssueFiltersChange?: (filters: any) => void
  onExportIssues?: () => void
}

export const ChartSection = ({ period, issues, loading, onPeriodChange, issueFilters, onIssueFiltersChange, onExportIssues }: ChartSectionProps) => {
  const [burnDownData, setBurnDownData] = useState<ChartData[]>([])
  const [burnUpData, setBurnUpData] = useState<ChartData[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartView, setChartView] = useState<'both' | 'burndown' | 'burnup'>('both')
  const [error, setError] = useState<string>('')
  const [showDetailFilters, setShowDetailFilters] = useState(false)

  // マイルストーン一覧
  const milestones = [...new Set(issues.map(i => i.milestone).filter(Boolean))]
  
  // Issueフィルタ用のユニークな値
  const filterOptions = useMemo(() => {
    const assignees = Array.from(new Set(issues.map(i => i.assignee).filter(Boolean)))
    const kanbanStatuses = Array.from(new Set(issues.map(i => i.kanban_status).filter(Boolean)))
    const services = Array.from(new Set(issues.map(i => i.service).filter(Boolean)))
    
    return {
      assignees: assignees.sort(),
      kanbanStatuses: kanbanStatuses.sort(),
      services: services.sort()
    }
  }, [issues])

  // 残日数計算 - 条件的レンダリングの外に移動してフック順序を一定に保つ
  const remainingBusinessDays = useMemo(() => {
    if (!period.end) return 0;
    const today = new Date();
    const end = new Date(period.end);
    if (today >= end) return 0;
    
    // 簡易計算（実際の営業日計算は別途必要）
    const diffTime = Math.abs(end.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(diffDays * 5 / 7)); // 概算の営業日
  }, [period.end])

  const handleIssueFilterChange = (key: string, value: string | number | undefined) => {
    if (onIssueFiltersChange && issueFilters) {
      onIssueFiltersChange({
        ...issueFilters,
        [key]: value
      })
    }
  }

  const activeDetailFilterCount = issueFilters ? 
    Object.entries(issueFilters).filter(([key, value]) => 
      key !== 'search' && value !== undefined && value !== null && value !== ''
    ).length : 0

  const hasActiveSearch = issueFilters?.search && issueFilters.search !== ''


  const fetchChartData = async () => {
    setChartLoading(true)
    setError('')
    
    try {
      // フィルタパラメータを準備（完全なフィルタセット）
      const chartFilters = issueFilters ? {
        service: issueFilters.service || undefined,
        assignee: issueFilters.assignee || undefined,
        kanban_status: issueFilters.kanban_status || undefined,
        state: issueFilters.state || undefined,
        is_epic: issueFilters.is_epic || undefined,
        point_min: issueFilters.point_min,
        point_max: issueFilters.point_max,
        search: issueFilters.search || undefined,
        created_after: issueFilters.created_at_from || undefined,
        created_before: issueFilters.created_at_to || undefined,
        completed_after: issueFilters.completed_at_from || undefined,
        completed_before: issueFilters.completed_at_to || undefined
      } : undefined
      
      const [burnDown, burnUp] = await Promise.all([
        chartsApi.getBurnDownData(
          issueFilters?.milestone || undefined,
          period.start,
          period.end,
          chartFilters
        ),
        chartsApi.getBurnUpData(
          issueFilters?.milestone || undefined,
          period.start,
          period.end,
          chartFilters
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

  useEffect(() => {
    if (!loading && period.start && period.end) {
      // フィルタリング後のissue数が0の場合、チャートデータをクリア
      if (issues.length === 0) {
        setBurnDownData([])
        setBurnUpData([])
        setChartLoading(false)
        setError('')
      } else {
        fetchChartData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, issueFilters?.milestone, loading, issues.length])

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

      {/* フィルタ・表示条件 */}
      <div className="chart-filters">
        {/* 期間フィルタ */}
        <div className="filter-group">
          <PeriodSelector 
            value={period}
            onChange={onPeriodChange}
          />
        </div>
        
        {/* 表示タイプフィルタ */}
        <div className="filter-group">
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
        
        {/* 詳細フィルタトグル */}
        {issueFilters && onIssueFiltersChange && (
          <div className="filter-group">
            <button 
              className="detail-filters-toggle"
              onClick={() => setShowDetailFilters(!showDetailFilters)}
            >
              <span className="filter-icon">🔍</span>
              詳細フィルタ
              {(activeDetailFilterCount > 0 || hasActiveSearch) && (
                <span className="active-filter-count">
                  {activeDetailFilterCount + (hasActiveSearch ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        )}
        
        {/* Issues CSVエクスポート */}
        {onExportIssues && (
          <div className="filter-group">
            <button 
              className="export-btn"
              onClick={onExportIssues}
              disabled={loading || issues.length === 0}
            >
              Issues CSV エクスポート
            </button>
          </div>
        )}
      </div>

      {/* 詳細フィルタエリア */}
      {issueFilters && onIssueFiltersChange && showDetailFilters && (
        <div className="detail-filters">
          {/* Row 1: Service, Milestone, Title */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Service:</label>
              <select
                value={issueFilters.service}
                onChange={(e) => handleIssueFilterChange('service', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Milestone:</label>
              <select
                value={issueFilters.milestone}
                onChange={(e) => handleIssueFilterChange('milestone', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {milestones.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Epic:</label>
              <select
                value={issueFilters.is_epic}
                onChange={(e) => handleIssueFilterChange('is_epic', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                <option value="epic">Epic</option>
                <option value="normal">通常</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Title:</label>
              <input
                type="text"
                placeholder="タイトル検索..."
                value={issueFilters.search}
                onChange={(e) => handleIssueFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
          
          {/* Row 2: Point, Kanban Status, Assignee */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Point:</label>
              <div className="point-range-inputs">
                <input
                  type="number"
                  placeholder="最小"
                  value={issueFilters.point_min || ''}
                  onChange={(e) => handleIssueFilterChange('point_min', e.target.value ? Number(e.target.value) : undefined)}
                  className="filter-input number-input"
                  min="0"
                />
                <span className="range-separator">≤</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={issueFilters.point_max || ''}
                  onChange={(e) => handleIssueFilterChange('point_max', e.target.value ? Number(e.target.value) : undefined)}
                  className="filter-input number-input"
                  min="0"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Kanban Status:</label>
              <select
                value={issueFilters.kanban_status}
                onChange={(e) => handleIssueFilterChange('kanban_status', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.kanbanStatuses.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Assignee:</label>
              <select
                value={issueFilters.assignee}
                onChange={(e) => handleIssueFilterChange('assignee', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {filterOptions.assignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Row 3: Created At, Completed At, State */}
          <div className="detail-filters-row">
            <div className="filter-group">
              <label>Created At:</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={issueFilters.created_at_from}
                  onChange={(e) => handleIssueFilterChange('created_at_from', e.target.value)}
                  className="filter-input date-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="date"
                  value={issueFilters.created_at_to}
                  onChange={(e) => handleIssueFilterChange('created_at_to', e.target.value)}
                  className="filter-input date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>Completed At:</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={issueFilters.completed_at_from}
                  onChange={(e) => handleIssueFilterChange('completed_at_from', e.target.value)}
                  className="filter-input date-input"
                />
                <span className="range-separator">〜</span>
                <input
                  type="date"
                  value={issueFilters.completed_at_to}
                  onChange={(e) => handleIssueFilterChange('completed_at_to', e.target.value)}
                  className="filter-input date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label>State:</label>
              <select
                value={issueFilters.state}
                onChange={(e) => handleIssueFilterChange('state', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                <option value="opened">Opened</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          
          {/* フィルタリセットボタン */}
          <div className="filter-reset-section">
            <button 
              className="filter-reset-btn"
              onClick={() => {
                if (onIssueFiltersChange) {
                  onIssueFiltersChange({
                    search: '',
                    milestone: '',
                    assignee: '',
                    kanban_status: '',
                    service: '',
                    state: '',
                    point_min: undefined,
                    point_max: undefined,
                    created_at_from: '',
                    created_at_to: '',
                    completed_at_from: '',
                    completed_at_to: '',
                    is_epic: ''
                  })
                }
              }}
            >
              <span className="reset-icon">🔄</span>
              フィルタをリセット
            </button>
          </div>
        </div>
      )}

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
              startDate={period.start}
              endDate={period.end}
            />
          </div>
        )}
      </div>
      
      {/* 統合された統計セクション */}
      {(burnUpData.length > 0 || burnDownData.length > 0) && (
        <div className="unified-chart-summary">
          <h3>プロジェクト統計</h3>
          <div className="summary-period">
            期間: {period.start} ～ {period.end}
            {(() => {
              // 期間から四半期情報を取得
              const quarters = getOverlappingQuarters(period.start, period.end)
              return quarters.length > 0 ? ` （${quarters.join(', ')}）` : ''
            })()}
          </div>
          <div className="summary-grid">
            {(() => {
              // BurnUpとBurnDownのどちらかのデータを使用して統計を計算
              const data = burnUpData.length > 0 ? burnUpData : burnDownData;
              const totalPoints = data[data.length - 1]?.total_points || 0;
              const completedPoints = burnUpData.length > 0 
                ? data[data.length - 1]?.completed_points || 0
                : totalPoints - (data[data.length - 1]?.remaining_points || 0);
              const remainingPoints = totalPoints - completedPoints;
              const completionRate = totalPoints > 0 ? (completedPoints / totalPoints * 100) : 0;
              
              return (
                <>
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
                  <div className="summary-item">
                    <span className="summary-label">残ポイント:</span>
                    <span className="summary-value">{remainingPoints.toFixed(1)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">残日数（営業日）:</span>
                    <span className="summary-value">{remainingBusinessDays}日</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
    </div>
  )
}
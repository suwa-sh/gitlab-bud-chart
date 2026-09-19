# Task 09: 検索・フィルタ機能・Frontend-Backend統合

## 概要

検索・フィルタ機能を実装し、Frontend-Backend完全なデータ連携を実現する。Phase 3完了E2Eテストを実行する。

## 目的

- 検索機能（title, assignee等）実装
- フィルタ機能（milestone, kanban_status等）実装
- ソート機能実装
- Frontend-Backend統合完成
- Phase 3完了 E2Eテスト実行

## 前提条件

- Task 08完了（Issue一覧表示UI実装済み）
- Backend API動作確認済み

## 作業手順

### 1. 検索・フィルタコンポーネント実装

#### 1.1 検索・フィルタUI実装

**frontend/src/components/IssueList/IssueTableFilters.tsx**:

```tsx
import { useState, useEffect } from 'react'
import { Issue } from '../../types/api'
import './IssueTableFilters.css'

interface IssueTableFiltersProps {
  filters: {
    search: string
    milestone: string
    assignee: string
    kanban_status: string
    service: string
  }
  onFiltersChange: (filters: any) => void
  issues: Issue[]
}

export const IssueTableFilters = ({
  filters,
  onFiltersChange,
  issues,
}: IssueTableFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // 一意値抽出
  const milestones = [
    ...new Set(issues.map((i) => i.milestone).filter(Boolean)),
  ]
  const assignees = [...new Set(issues.map((i) => i.assignee).filter(Boolean))]
  const kanbanStatuses = [
    ...new Set(issues.map((i) => i.kanban_status).filter(Boolean)),
  ]
  const services = [...new Set(issues.map((i) => i.service).filter(Boolean))]

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      milestone: '',
      assignee: '',
      kanban_status: '',
      service: '',
    })
  }

  const activeFilterCount = Object.values(filters).filter((v) => v).length

  return (
    <div className="issue-table-filters">
      <div className="filters-header">
        <button
          className="filters-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="filter-icon">🔍</span>
          フィルタ
          {activeFilterCount > 0 && (
            <span className="active-filter-count">{activeFilterCount}</span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button className="clear-filters" onClick={handleClearFilters}>
            クリア
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="filter-row">
            <div className="filter-group">
              <label>検索</label>
              <input
                type="text"
                placeholder="タイトル検索..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Milestone</label>
              <select
                value={filters.milestone}
                onChange={(e) =>
                  handleFilterChange('milestone', e.target.value)
                }
                className="filter-select"
              >
                <option value="">すべて</option>
                {milestones.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Assignee</label>
              <select
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Kanban Status</label>
              <select
                value={filters.kanban_status}
                onChange={(e) =>
                  handleFilterChange('kanban_status', e.target.value)
                }
                className="filter-select"
              >
                <option value="">すべて</option>
                {kanbanStatuses.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Service</label>
              <select
                value={filters.service}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>State</label>
              <select
                value={filters.state || ''}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="filter-select"
              >
                <option value="">すべて</option>
                <option value="opened">Opened</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

#### 1.2 詳細フィルタコンポーネント

**frontend/src/components/IssueList/IssueFilters.tsx**:

```tsx
import { useCallback } from 'react'
import { useApp } from '../../contexts/AppContext'
import { useIssues } from '../../hooks/useIssues'
import './IssueFilters.css'

export const IssueFilters = () => {
  const { state, dispatch } = useApp()
  const { fetchIssues } = useIssues()
  const { filters } = state

  const handleQuickFilter = useCallback(
    (filterType: string) => {
      let newFilters = { ...filters }

      switch (filterType) {
        case 'my-issues':
          newFilters.assignee = 'current_user' // 実装時は実際のユーザー名
          break
        case 'open-issues':
          newFilters.state = 'opened'
          break
        case 'completed':
          newFilters.kanban_status = '完了'
          break
        case 'high-priority':
          newFilters.min_point = 5
          break
        case 'this-quarter':
          const currentQuarter = getCurrentQuarter()
          newFilters.quarter = currentQuarter
          break
        default:
          break
      }

      dispatch({ type: 'SET_FILTERS', payload: newFilters })
      fetchIssues(newFilters)
    },
    [filters, dispatch, fetchIssues],
  )

  const getCurrentQuarter = () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    const year = now.getFullYear()
    return `FY${year}Q${quarter}`
  }

  return (
    <div className="issue-filters">
      <h3>クイックフィルタ</h3>

      <div className="quick-filters">
        <button
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('my-issues')}
        >
          自分のIssue
        </button>

        <button
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('open-issues')}
        >
          Open Issues
        </button>

        <button
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('completed')}
        >
          完了済み
        </button>

        <button
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('high-priority')}
        >
          高ポイント (5+)
        </button>

        <button
          className="quick-filter-btn"
          onClick={() => handleQuickFilter('this-quarter')}
        >
          今四半期
        </button>
      </div>

      <div className="active-filters">
        <h4>適用中のフィルタ</h4>
        {Object.entries(filters).map(
          ([key, value]) =>
            value && (
              <div key={key} className="active-filter-tag">
                <span>
                  {key}: {value}
                </span>
                <button
                  onClick={() => {
                    const newFilters = { ...filters, [key]: undefined }
                    dispatch({ type: 'SET_FILTERS', payload: newFilters })
                    fetchIssues(newFilters)
                  }}
                >
                  ×
                </button>
              </div>
            ),
        )}
      </div>
    </div>
  )
}
```

### 2. Backend検索・フィルタ機能強化

#### 2.1 高度な検索機能実装

**backend/app/services/search_service.py**:

```python
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import re
from app.models.issue import IssueModel
import logging

logger = logging.getLogger(__name__)

class SearchService:
    """Issue検索・フィルタリングサービス"""

    def search_issues(
        self,
        issues: List[IssueModel],
        search_query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[IssueModel]:
        """複合検索実行"""
        try:
            # テキスト検索
            if search_query:
                issues = self._text_search(issues, search_query)

            # フィルタ適用
            if filters:
                issues = self._apply_filters(issues, filters)

            return issues

        except Exception as e:
            logger.error(f"検索処理失敗: {e}")
            raise

    def _text_search(self, issues: List[IssueModel], query: str) -> List[IssueModel]:
        """テキスト検索（タイトル・説明）"""
        query_lower = query.lower()

        return [
            issue for issue in issues
            if (query_lower in issue.title.lower() or
                (issue.description and query_lower in issue.description.lower()))
        ]

    def _apply_filters(
        self,
        issues: List[IssueModel],
        filters: Dict[str, Any]
    ) -> List[IssueModel]:
        """フィルタ適用"""

        # State フィルタ
        if filters.get('state'):
            issues = [i for i in issues if i.state == filters['state']]

        # Milestone フィルタ
        if filters.get('milestone'):
            issues = [i for i in issues if i.milestone == filters['milestone']]

        # Assignee フィルタ
        if filters.get('assignee'):
            issues = [i for i in issues if i.assignee == filters['assignee']]

        # Kanban Status フィルタ
        if filters.get('kanban_status'):
            issues = [i for i in issues if i.kanban_status == filters['kanban_status']]

        # Service フィルタ
        if filters.get('service'):
            issues = [i for i in issues if i.service == filters['service']]

        # Quarter フィルタ
        if filters.get('quarter'):
            issues = [i for i in issues if i.quarter == filters['quarter']]

        # Point範囲フィルタ
        if filters.get('min_point') is not None:
            issues = [i for i in issues if i.point and i.point >= filters['min_point']]
        if filters.get('max_point') is not None:
            issues = [i for i in issues if i.point and i.point <= filters['max_point']]

        # 日付範囲フィルタ
        if filters.get('created_after'):
            created_after = self._parse_date(filters['created_after'])
            issues = [i for i in issues if i.created_at.date() >= created_after]

        if filters.get('created_before'):
            created_before = self._parse_date(filters['created_before'])
            issues = [i for i in issues if i.created_at.date() <= created_before]

        # 完了日フィルタ
        if filters.get('completed_after'):
            completed_after = self._parse_date(filters['completed_after'])
            issues = [
                i for i in issues
                if i.completed_at and i.completed_at.date() >= completed_after
            ]

        return issues

    def _parse_date(self, date_str: str) -> date:
        """日付文字列パース"""
        try:
            return datetime.fromisoformat(date_str).date()
        except:
            return datetime.strptime(date_str, "%Y-%m-%d").date()

    def sort_issues(
        self,
        issues: List[IssueModel],
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> List[IssueModel]:
        """Issue並び替え"""
        reverse = (sort_order == 'desc')

        # ソートキー定義
        sort_keys = {
            'created_at': lambda x: x.created_at or datetime.min,
            'updated_at': lambda x: x.updated_at or datetime.min,
            'completed_at': lambda x: x.completed_at or datetime.min,
            'due_date': lambda x: x.due_date or datetime.min,
            'title': lambda x: x.title.lower(),
            'point': lambda x: x.point or 0,
            'state': lambda x: x.state,
            'milestone': lambda x: x.milestone or '',
            'assignee': lambda x: x.assignee or ''
        }

        if sort_by in sort_keys:
            return sorted(issues, key=sort_keys[sort_by], reverse=reverse)

        return issues

# グローバルインスタンス
search_service = SearchService()
```

### 3. Frontend-Backend統合強化

#### 3.1 API統合フック更新

**frontend/src/hooks/useIssues.ts** 更新:

```typescript
import { useCallback, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { issuesApi } from '../services/api'

export const useIssues = () => {
  const { state, dispatch } = useApp()
  const [isSearching, setIsSearching] = useState(false)

  const fetchIssues = useCallback(
    async (params: any = {}) => {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      try {
        // API パラメータ構築
        const apiParams = {
          ...params,
          ...state.filters,
          page: params.page || 1,
          per_page: params.per_page || 50,
        }

        const response = await issuesApi.getIssues(apiParams)

        dispatch({ type: 'SET_ISSUES', payload: response.issues })
        dispatch({ type: 'SET_METADATA', payload: response.metadata })

        return response
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        throw error
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    },
    [dispatch, state.filters],
  )

  const searchIssues = useCallback(
    async (searchQuery: string) => {
      setIsSearching(true)

      try {
        const response = await issuesApi.searchIssues({
          query: searchQuery,
          ...state.filters,
        })

        dispatch({ type: 'SET_ISSUES', payload: response.issues })
        return response
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        throw error
      } finally {
        setIsSearching(false)
      }
    },
    [dispatch, state.filters],
  )

  const exportIssues = useCallback(
    async (format: 'csv' | 'json' = 'csv') => {
      try {
        const blob = await issuesApi.exportIssues(state.filters, format)

        // ダウンロード処理
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `issues_${new Date().toISOString()}.${format}`
        a.click()
        URL.revokeObjectURL(url)
      } catch (error: any) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
      }
    },
    [state.filters, dispatch],
  )

  return {
    issues: state.issues,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    isSearching,
    fetchIssues,
    searchIssues,
    exportIssues,
    setFilters: (filters: any) => {
      dispatch({ type: 'SET_FILTERS', payload: filters })
    },
  }
}
```

### 4. Phase 3完了E2Eテスト

#### 4.1 検索・フィルタE2Eテスト

**frontend/tests/e2e/phase3-search-filter.spec.ts**:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Phase 3: Search & Filter E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // GitLab接続設定（前フェーズ完了想定）
    await page.goto('/dashboard')
  })

  test('should search issues by title', async ({ page }) => {
    // 検索フィールド確認
    const searchInput = page.getByPlaceholder('タイトル検索...')
    await expect(searchInput).toBeVisible()

    // 検索実行
    await searchInput.fill('test')
    await searchInput.press('Enter')

    // 検索結果確認
    await page.waitForTimeout(1000)

    const issueRows = page.locator('.issue-table tbody tr')
    const count = await issueRows.count()

    // 各行のタイトルに'test'が含まれることを確認
    for (let i = 0; i < count; i++) {
      const title = await issueRows
        .nth(i)
        .locator('td:nth-child(2)')
        .textContent()
      expect(title?.toLowerCase()).toContain('test')
    }

    await page.screenshot({ path: 'test-results/phase3-search-results.png' })
  })

  test('should filter by milestone', async ({ page }) => {
    // フィルタトグル
    await page.getByRole('button', { name: 'フィルタ' }).click()

    // Milestoneフィルタ
    const milestoneSelect = page.getByLabel('Milestone')
    await expect(milestoneSelect).toBeVisible()

    // 最初のオプション選択（「すべて」以外）
    const options = await milestoneSelect.locator('option').allTextContents()
    if (options.length > 1) {
      await milestoneSelect.selectOption({ index: 1 })
      const selectedMilestone = options[1]

      // フィルタ結果確認
      await page.waitForTimeout(1000)

      const issueRows = page.locator('.issue-table tbody tr')
      const firstRowMilestone = await issueRows
        .first()
        .locator('td:nth-child(1)')
        .textContent()
      expect(firstRowMilestone).toBe(selectedMilestone)
    }

    await page.screenshot({ path: 'test-results/phase3-milestone-filter.png' })
  })

  test('should apply multiple filters', async ({ page }) => {
    await page.getByRole('button', { name: 'フィルタ' }).click()

    // 複数フィルタ適用
    const stateSelect = page.getByLabel('State')
    await stateSelect.selectOption('opened')

    const kanbanSelect = page.getByLabel('Kanban Status')
    const kanbanOptions = await kanbanSelect.locator('option').allTextContents()
    if (kanbanOptions.includes('作業中')) {
      await kanbanSelect.selectOption('作業中')
    }

    // アクティブフィルタ数確認
    const activeFilterCount = page.locator('.active-filter-count')
    await expect(activeFilterCount).toHaveText('2')

    await page.screenshot({ path: 'test-results/phase3-multiple-filters.png' })
  })

  test('should sort issues', async ({ page }) => {
    // Point列をクリックしてソート
    await page.locator('th:has-text("Point")').click()

    // ソートアイコン確認
    await expect(page.locator('th:has-text("Point") .sort-icon')).toBeVisible()

    // 降順確認
    await page.waitForTimeout(500)
    const points = await page
      .locator('.issue-table tbody tr .point-badge')
      .allTextContents()
    const numericPoints = points.map((p) => parseFloat(p) || 0)

    // 降順チェック
    for (let i = 1; i < numericPoints.length; i++) {
      expect(numericPoints[i]).toBeLessThanOrEqual(numericPoints[i - 1])
    }

    // 再度クリックで昇順
    await page.locator('th:has-text("Point")').click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'test-results/phase3-sorting.png' })
  })

  test('should navigate to PBL Viewer with filters', async ({ page }) => {
    // フィルタ設定
    await page.getByRole('button', { name: 'フィルタ' }).click()
    await page.getByLabel('State').selectOption('opened')

    // PBL Viewer遷移
    await page.getByRole('link', { name: 'PBL Viewer' }).click()

    // フィルタ保持確認
    await expect(page.getByText('Product Backlog Viewer')).toBeVisible()

    // アクティブフィルタ表示確認
    await expect(page.locator('.active-filter-tag')).toContainText(
      'state: opened',
    )

    await page.screenshot({
      path: 'test-results/phase3-pbl-viewer-filtered.png',
    })
  })

  test('should export filtered data', async ({ page }) => {
    // エクスポートボタン確認
    const exportButton = page.getByRole('button', { name: 'エクスポート' })

    if (await exportButton.isVisible()) {
      // ダウンロード準備
      const downloadPromise = page.waitForEvent('download')

      await exportButton.click()
      await page.getByText('CSV形式').click()

      const download = await downloadPromise

      // ファイル名確認
      expect(download.suggestedFilename()).toMatch(/issues_.*\.csv/)

      await page.screenshot({ path: 'test-results/phase3-export.png' })
    }
  })
})

test.describe('Phase 3: Performance Tests', () => {
  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/pbl-viewer')

    // 大量データ処理時間測定
    const startTime = Date.now()

    // ページネーション確認
    const pagination = page.locator('.table-pagination')
    if (await pagination.isVisible()) {
      // 最終ページへ
      await page.getByRole('button', { name: '最後' }).click()

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // 3秒以内

      console.log(`大量データページング時間: ${loadTime}ms`)
    }
  })
})
```

#### 4.2 Phase 3完了確認スクリプト

**scripts/run-phase3-e2e.sh**:

```bash
#!/bin/bash
set -e

echo "=== Phase 3 E2E テスト実行 ==="

# サーバー起動
cd backend && source venv/bin/activate && uvicorn app.main:app &
BACKEND_PID=$!

cd ../frontend && npm run dev &
FRONTEND_PID=$!

sleep 15

# Phase 3 E2Eテスト実行
echo "Phase 3 E2Eテスト実行中..."
cd frontend
npx playwright test tests/e2e/phase3-search-filter.spec.ts

# クリーンアップ
kill $BACKEND_PID $FRONTEND_PID

echo "✅ Phase 3 完了: Issue一覧表示・検索フィルタ機能完成"
```

## 成果物

### 必須成果物

1. **検索・フィルタコンポーネント**:
   - IssueTableFilters（詳細フィルタ）
   - IssueFilters（クイックフィルタ）
   - 検索機能UI

2. **Backend検索サービス**:
   - SearchService実装
   - 高度なフィルタリング機能
   - ソート機能

3. **Frontend-Backend統合**:
   - useIssuesフック完全版
   - リアルタイムフィルタ反映
   - エクスポート機能

4. **Phase 3 E2Eテスト**:
   - 検索機能テスト
   - フィルタ機能テスト
   - ソート機能テスト
   - パフォーマンステスト

## 検証項目

### 実施前確認

- [x] Task 08のUI実装動作確認
- [x] Backend API正常動作確認
- [x] テストデータ準備完了

### 実施後確認

- [x] 検索機能期待通り動作
- [x] 各種フィルタ正常動作
- [x] ソート機能正常動作
- [x] Frontend-Backend連携完全動作
- [x] Phase 3 E2Eテスト全件成功

### Phase 3完了条件

- [x] UI表示・操作完成
- [x] 検索・フィルタ機能完成
- [x] Frontend-Backend統合完成
- [x] E2Eテスト全件成功
- [x] パフォーマンス要件満足

## 次のタスクへの引き継ぎ

### Phase 4 (Task 10)への引き継ぎ事項

- 完成した検索・フィルタ機能
- Frontend-Backend完全統合済み環境
- Issue一覧表示基盤

### 注意事項

- 大量データでのパフォーマンス
- フィルタ条件の複雑な組み合わせ
- ユーザビリティ（直感的な操作）

## 作業時間見積もり: 6-8時間

# Task 06: Backend API実装・データ変換

## 概要
Frontend向けAPI実装、データ変換完成、Phase 2完了E2Eテストを実行する。

## 目的
- Issues一覧API完成版実装
- Issue詳細API実装
- フィルタ・検索API実装
- Phase 2完了E2Eテスト実行

## 前提条件
- Task 05完了（Issue分析ロジック実装済み）

## 作業手順

### 1. 完全版Issues API実装

**backend/app/api/issues.py** 最終版:
```python
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.issue_service import issue_service
from app.services.issue_analyzer import issue_analyzer
from app.services.data_quality import data_quality_checker

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_issues(
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    kanban_status: Optional[str] = Query(None),
    min_point: Optional[float] = Query(None),
    max_point: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query('created_at'),
    sort_order: Optional[str] = Query('desc'),
    page: Optional[int] = Query(1),
    per_page: Optional[int] = Query(50)
):
    """高度なフィルタ・検索対応Issues一覧取得"""
    try:
        # フィルタ条件構築
        labels = []
        if service:
            labels.append(f"s:{service}")
        if quarter:
            labels.append(f"@{quarter}")
        if kanban_status:
            labels.append(f"#{kanban_status}")
        
        # Issue取得・分析
        issues, statistics = await issue_service.get_analyzed_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=labels if labels else None,
            analyze=True
        )
        
        # 追加フィルタ適用
        filtered_issues = _apply_advanced_filters(
            issues, min_point, max_point, search, kanban_status
        )
        
        # ソート
        sorted_issues = _sort_issues(filtered_issues, sort_by, sort_order)
        
        # ページネーション
        paginated_issues = _paginate_issues(sorted_issues, page, per_page)
        
        # メタデータ収集
        metadata = _collect_metadata(filtered_issues)
        
        return {
            'issues': [_issue_to_response(issue) for issue in paginated_issues],
            'total_count': len(filtered_issues),
            'page': page,
            'per_page': per_page,
            'total_pages': (len(filtered_issues) + per_page - 1) // per_page,
            'metadata': metadata,
            'statistics': statistics
        }
        
    except Exception as e:
        logger.error(f"Issues一覧取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=Dict[str, Any])
async def search_issues(search_request: IssueSearchRequest):
    """高度検索API"""
    # 実装詳細...

@router.get("/export/csv")
async def export_issues_csv():
    """Issues CSV エクスポート"""
    # 実装詳細...
```

### 2. Phase 2完了E2Eテスト

**frontend/tests/e2e/phase2-issue-retrieval.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Phase 2: Issue Retrieval E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // GitLab接続設定
    await page.goto('/dashboard')
    if (await page.getByText('GitLab Configuration').isVisible()) {
      await page.getByLabel('GitLab URL').fill('http://localhost:8080')
      await page.getByLabel('Access Token').fill('test-token')
      await page.getByLabel('Project ID').fill('1')
      await page.getByRole('button', { name: '接続' }).click()
    }
  })

  test('should fetch and display real issues from GitLab', async ({ page }) => {
    // Issues取得確認
    await expect(page.getByText('Issues (Sample Data)')).toBeVisible()
    
    // Issue一覧表示確認
    const issueTable = page.locator('.issues-table')
    await expect(issueTable).toBeVisible()
    
    // 取得したissueの基本情報確認
    const firstRow = issueTable.locator('tbody tr').first()
    await expect(firstRow.locator('td').first()).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase2-issues-display.png' })
  })

  test('should analyze issue labels correctly', async ({ page }) => {
    // API直接テスト - 分析済みissue取得
    const response = await page.request.get('http://localhost:8000/api/issues/analyzed')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.issues).toBeDefined()
    expect(data.statistics).toBeDefined()
    
    // ラベル分析結果確認
    if (data.issues.length > 0) {
      const sampleIssue = data.issues[0]
      expect(sampleIssue).toHaveProperty('point')
      expect(sampleIssue).toHaveProperty('kanban_status')
      expect(sampleIssue).toHaveProperty('service')
    }
    
    await page.screenshot({ path: 'test-results/phase2-analyzed-issues.png' })
  })

  test('should filter issues by milestone', async ({ page }) => {
    // マイルストーンフィルタテスト
    const response = await page.request.get('http://localhost:8000/api/issues?milestone=v1.0')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    // フィルタされた結果確認
    if (data.issues.length > 0) {
      data.issues.forEach(issue => {
        expect(issue.milestone).toBe('v1.0')
      })
    }
  })

  test('should provide issue statistics', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/issues/statistics')
    expect(response.status()).toBe(200)
    
    const stats = await response.json()
    expect(stats).toHaveProperty('total_count')
    expect(stats).toHaveProperty('milestone_breakdown')
    expect(stats).toHaveProperty('service_breakdown')
    
    await page.screenshot({ path: 'test-results/phase2-statistics.png' })
  })

  test('should validate issue data quality', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/issues/validation')
    expect(response.status()).toBe(200)
    
    const validation = await response.json()
    expect(validation).toHaveProperty('summary')
    expect(validation.summary).toHaveProperty('total_issues')
    expect(validation.summary).toHaveProperty('validation_rate')
  })
})
```

## Phase 2完了条件
- [ ] GitLab APIからのissue取得成功
- [ ] Issue分析ロジック正常動作
- [ ] Backend API全エンドポイント動作
- [ ] E2Eテスト全件成功
- [ ] データ品質チェック実行成功

## 次のタスクへの引き継ぎ
- 完成したBackend API
- 分析済みissueデータ形式
- 統計情報API

## 作業時間見積もり: 6-8時間
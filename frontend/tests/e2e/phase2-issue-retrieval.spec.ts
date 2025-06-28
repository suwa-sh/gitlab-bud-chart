import { test, expect } from '@playwright/test'

test.describe('Phase 2: Issue Retrieval E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードにアクセス
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display frontend application properly', async ({ page }) => {
    // アプリケーション基本表示確認
    await expect(page.locator('body')).toBeVisible()
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/GitLab.*Chart/i)
    
    // 基本コンポーネントの存在確認
    const dashboardElement = page.locator('[data-testid="dashboard"], .dashboard, h1, h2').first()
    await expect(dashboardElement).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase2-frontend-display.png' })
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
    if (data.issues && data.issues.length > 0) {
      data.issues.forEach(issue => {
        expect(issue.milestone).toBe('v1.0')
      })
    }
  })

  test('should filter issues by service', async ({ page }) => {
    // サービスフィルタテスト
    const response = await page.request.get('http://localhost:8000/api/issues?service=backend')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    // フィルタされた結果確認
    if (data.issues && data.issues.length > 0) {
      data.issues.forEach(issue => {
        expect(issue.service).toBe('backend')
      })
    }
  })

  test('should filter issues by quarter', async ({ page }) => {
    // Quarterフィルタテスト
    const response = await page.request.get('http://localhost:8000/api/issues?quarter=FY25Q1')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    // フィルタされた結果確認
    if (data.issues && data.issues.length > 0) {
      data.issues.forEach(issue => {
        expect(issue.quarter).toBe('FY25Q1')
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

  test('should support advanced search', async ({ page }) => {
    // 高度検索APIテスト
    const searchRequest = {
      query: 'test',
      state: 'all',
      service: 'backend',
      min_point: 1.0,
      max_point: 5.0,
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 10
    }
    
    const response = await page.request.post('http://localhost:8000/api/issues/search', {
      data: searchRequest
    })
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('issues')
    expect(data).toHaveProperty('total_count')
    expect(data).toHaveProperty('page')
    expect(data).toHaveProperty('per_page')
    expect(data).toHaveProperty('total_pages')
    expect(data).toHaveProperty('metadata')
    expect(data).toHaveProperty('search_criteria')
  })

  test('should support pagination', async ({ page }) => {
    // ページネーションテスト
    const response = await page.request.get('http://localhost:8000/api/issues?page=1&per_page=5')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('page')
    expect(data).toHaveProperty('per_page')
    expect(data).toHaveProperty('total_pages')
    expect(data.page).toBe(1)
    expect(data.per_page).toBe(5)
    
    if (data.issues) {
      expect(data.issues.length).toBeLessThanOrEqual(5)
    }
  })

  test('should support sorting', async ({ page }) => {
    // ソート機能テスト
    const response = await page.request.get('http://localhost:8000/api/issues?sort_by=point&sort_order=desc')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('issues')
    
    // Point値でソートされていることを確認
    if (data.issues && data.issues.length > 1) {
      const points = data.issues
        .filter(issue => issue.point !== null)
        .map(issue => issue.point)
      
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeLessThanOrEqual(points[i - 1])
      }
    }
  })

  test('should export CSV', async ({ page }) => {
    // CSV エクスポートテスト
    const response = await page.request.get('http://localhost:8000/api/issues/export/csv')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/csv')
    expect(response.headers()['content-disposition']).toContain('attachment; filename="issues.csv"')
    
    const csvContent = await response.text()
    expect(csvContent).toContain('ID,Title,State')
  })

  test('should provide detailed metadata', async ({ page }) => {
    // メタデータAPIテスト
    const response = await page.request.get('http://localhost:8000/api/issues')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('metadata')
    
    const metadata = data.metadata
    expect(metadata).toHaveProperty('milestones')
    expect(metadata).toHaveProperty('assignees')
    expect(metadata).toHaveProperty('services')
    expect(metadata).toHaveProperty('quarters')
    expect(metadata).toHaveProperty('kanban_statuses')
    
    // 配列形式であることを確認
    expect(Array.isArray(metadata.milestones)).toBe(true)
    expect(Array.isArray(metadata.assignees)).toBe(true)
    expect(Array.isArray(metadata.services)).toBe(true)
    expect(Array.isArray(metadata.quarters)).toBe(true)
    expect(Array.isArray(metadata.kanban_statuses)).toBe(true)
  })
})
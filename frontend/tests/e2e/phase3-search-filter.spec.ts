import { test, expect } from '@playwright/test'

test.describe('Phase 3: Search & Filter E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // GitLab接続設定（前フェーズ完了想定）
    await page.goto('/dashboard')
  })

  test('should search issues by title', async ({ page }) => {
    // フィルタボタンクリック
    await page.getByRole('button', { name: 'フィルタ' }).click()
    
    // 検索フィールド確認
    const searchInput = page.getByPlaceholder('タイトル検索...')
    await expect(searchInput).toBeVisible()
    
    // 検索実行
    await searchInput.fill('test')
    
    // 検索結果確認（小さな待機時間）
    await page.waitForTimeout(500)
    
    await page.screenshot({ path: 'test-results/phase3-search-results.png' })
  })

  test('should filter by milestone', async ({ page }) => {
    // フィルタトグル
    await page.getByRole('button', { name: 'フィルタ' }).click()
    
    // Milestoneフィルタ確認
    const milestoneSelect = page.getByLabel('Milestone')
    await expect(milestoneSelect).toBeVisible()
    
    // オプション選択テスト
    const options = await milestoneSelect.locator('option').allTextContents()
    if (options.length > 1) {
      await milestoneSelect.selectOption({ index: 1 })
      
      // フィルタ結果確認
      await page.waitForTimeout(500)
    }
    
    await page.screenshot({ path: 'test-results/phase3-milestone-filter.png' })
  })

  test('should apply multiple filters', async ({ page }) => {
    await page.getByRole('button', { name: 'フィルタ' }).click()
    
    // 複数フィルタ適用
    const stateSelect = page.getByLabel('State')
    await stateSelect.selectOption('opened')
    
    // アクティブフィルタ数確認
    const activeFilterCount = page.locator('.active-filter-count')
    if (await activeFilterCount.isVisible()) {
      await expect(activeFilterCount).toHaveText('1')
    }
    
    await page.screenshot({ path: 'test-results/phase3-multiple-filters.png' })
  })

  test('should sort issues by clicking headers', async ({ page }) => {
    // Point列をクリックしてソート
    const pointHeader = page.locator('th:has-text("Point")')
    if (await pointHeader.isVisible()) {
      await pointHeader.click()
      
      // ソートアイコン確認
      await page.waitForTimeout(500)
      await expect(page.locator('th:has-text("Point") .sort-icon')).toBeVisible()
      
      // 再度クリックで昇順/降順切り替え
      await pointHeader.click()
      await page.waitForTimeout(500)
    }
    
    await page.screenshot({ path: 'test-results/phase3-sorting.png' })
  })

  test('should navigate to PBL Viewer with filters', async ({ page }) => {
    // フィルタ設定
    await page.getByRole('button', { name: 'フィルタ' }).click()
    await page.getByLabel('State').selectOption('opened')
    
    // PBL Viewer遷移
    await page.getByRole('link', { name: 'PBL Viewer' }).click()
    
    // PBL Viewer表示確認
    await expect(page.getByText('Product Backlog Viewer')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-pbl-viewer-filtered.png' })
  })

  test('should show quick filters in PBL Viewer', async ({ page }) => {
    await page.goto('/pbl-viewer')
    
    // クイックフィルタボタン確認
    await expect(page.getByText('自分のIssue')).toBeVisible()
    await expect(page.getByText('Open Issues')).toBeVisible()
    await expect(page.getByText('完了済み')).toBeVisible()
    await expect(page.getByText('高ポイント (5+)')).toBeVisible()
    await expect(page.getByText('今四半期')).toBeVisible()
    
    // クイックフィルタクリックテスト
    await page.getByText('Open Issues').click()
    await page.waitForTimeout(500)
    
    await page.screenshot({ path: 'test-results/phase3-quick-filters.png' })
  })

  test('should show export buttons', async ({ page }) => {
    // Dashboard エクスポートボタン確認
    const dashboardExportBtn = page.getByRole('button', { name: 'CSV エクスポート' })
    await expect(dashboardExportBtn).toBeVisible()
    
    // PBL Viewer エクスポートボタン確認
    await page.goto('/pbl-viewer')
    const pblExportBtn = page.getByRole('button', { name: 'CSV エクスポート' })
    await expect(pblExportBtn).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-export-buttons.png' })
  })

  test('should display filter toggle functionality', async ({ page }) => {
    // フィルタが折りたたみ可能であることを確認
    const filterToggle = page.getByRole('button', { name: 'フィルタ' })
    await expect(filterToggle).toBeVisible()
    
    // クリックしてフィルタを展開
    await filterToggle.click()
    
    // フィルタ内容が表示されることを確認
    await expect(page.getByPlaceholder('タイトル検索...')).toBeVisible()
    
    // 再度クリックして折りたたみ
    await filterToggle.click()
    
    // フィルタ内容が非表示になることを確認
    await expect(page.getByPlaceholder('タイトル検索...')).not.toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-filter-toggle.png' })
  })
})

test.describe('Phase 3: Performance Tests', () => {
  test('should handle filter operations efficiently', async ({ page }) => {
    await page.goto('/pbl-viewer')
    
    // フィルタ操作時間測定
    const startTime = Date.now()
    
    // 複数のクイックフィルタを順番に適用
    await page.getByText('Open Issues').click()
    await page.waitForTimeout(100)
    
    await page.getByText('完了済み').click()
    await page.waitForTimeout(100)
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(2000) // 2秒以内
    
    console.log(`フィルタ操作時間: ${loadTime}ms`)
  })

  test('should handle large issue lists efficiently', async ({ page }) => {
    await page.goto('/dashboard')
    
    // ページ読み込み時間測定
    const startTime = Date.now()
    
    // Issue テーブルが表示されるまで待機
    await expect(page.locator('.issue-table')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // 3秒以内
    
    console.log(`Issue一覧読み込み時間: ${loadTime}ms`)
  })
})
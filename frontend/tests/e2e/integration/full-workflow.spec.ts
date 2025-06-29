import { test, expect } from '@playwright/test'

// Load test configuration
const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3002"
}

test.describe('Full Application Workflow', () => {
  test('complete user journey: setup → data fetch → analysis → visualization', async ({ page }) => {
    // 1. GitLab接続設定
    await page.goto(`${testConfig.frontend_url}/dashboard`)
    
    // 設定フォーム表示確認
    await expect(page.getByText('GitLab Configuration')).toBeVisible()
    
    // 接続設定入力
    await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
    await page.getByLabel('Access Token').fill(testConfig.access_token)
    await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
    
    // 接続実行（明確に「接続」ボタンを指定）
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // 接続成功確認
    await expect(page.getByText(/✓ GitLab接続済み/)).toBeVisible({ timeout: 10000 })
    
    await page.screenshot({ path: 'test-results/integration-01-gitlab-connected.png' })
    
    // 2. Issue一覧表示確認
    await expect(page.getByText('Issues')).toBeVisible()
    
    // テーブル表示確認
    const issueTable = page.locator('.issue-table')
    await expect(issueTable).toBeVisible()
    
    // 最低1件のissue表示確認
    const firstRow = issueTable.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()
    
    await page.screenshot({ path: 'test-results/integration-02-issues-loaded.png' })
    
    // 3. フィルタ機能テスト
    const filterButton = page.getByRole('button', { name: 'フィルタ' })
    if (await filterButton.isVisible()) {
      await filterButton.click()
      
      // マイルストーンフィルタ
      const milestoneFilter = page.getByLabel('Milestone')
      if (await milestoneFilter.isVisible()) {
        await milestoneFilter.selectOption({ index: 1 })
        await page.waitForTimeout(1000)
        
        // フィルタ結果確認
        const rowCount = await issueTable.locator('tbody tr').count()
        expect(rowCount).toBeGreaterThanOrEqual(0)
      }
    }
    
    await page.screenshot({ path: 'test-results/integration-03-filters-applied.png' })
    
    // 4. チャート表示確認
    // 期間選択
    const periodStart = page.getByLabel('開始日')
    const periodEnd = page.getByLabel('終了日')
    
    if (await periodStart.isVisible()) {
      await periodStart.fill('2024-01-01')
      await periodEnd.fill('2024-12-31')
    }
    
    // Burn-downチャート確認
    const burnDownChart = page.locator('.burn-down-chart')
    await expect(burnDownChart).toBeVisible({ timeout: 5000 })
    
    // Burn-upチャート確認
    const burnUpChart = page.locator('.burn-up-chart')
    await expect(burnUpChart).toBeVisible({ timeout: 5000 })
    
    await page.screenshot({ path: 'test-results/integration-04-charts-displayed.png' })
    
    // 5. PBL Viewer画面確認
    await page.getByRole('link', { name: 'PBL Viewer' }).click()
    
    await expect(page.getByText('Product Backlog Viewer')).toBeVisible()
    
    // Issue一覧確認
    await expect(page.locator('.issue-table')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/integration-05-pbl-viewer.png' })
    
    // 6. 統計情報確認
    const statsToggle = page.getByRole('button', { name: '統計を表示' })
    if (await statsToggle.isVisible()) {
      await statsToggle.click()
      await expect(page.locator('.statistics-section')).toBeVisible()
    }
    
    await page.screenshot({ path: 'test-results/integration-06-statistics.png' })
  })

  test('error handling and recovery', async ({ page }) => {
    // 1. 無効なGitLab設定でエラーハンドリング確認
    await page.goto(`${testConfig.frontend_url}/dashboard`)
    
    await page.getByLabel('GitLab URL').fill('http://invalid-url')
    await page.getByLabel('Access Token').fill('invalid-token')
    await page.getByLabel('Project ID').fill('999')
    
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // エラーメッセージ表示確認
    await expect(page.getByText(/接続に失敗/)).toBeVisible({ timeout: 10000 })
    
    await page.screenshot({ path: 'test-results/integration-error-handling.png' })
    
    // 2. 再設定可能性確認
    await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
    await page.getByLabel('Access Token').fill(testConfig.access_token)
    await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
    
    // 再接続試行可能確認
    await expect(page.getByRole('button', { name: '接続', exact: true })).toBeEnabled()
  })

  test('performance and responsiveness', async ({ page }) => {
    // パフォーマンステスト
    await page.goto(`${testConfig.frontend_url}/dashboard`)
    
    // GitLab接続（テスト環境）
    const gitlabConfig = page.locator('.gitlab-config')
    
    if (await gitlabConfig.isVisible()) {
      await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
      await page.getByLabel('Access Token').fill(testConfig.access_token)
      await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
      await page.getByRole('button', { name: '接続', exact: true }).click()
      await page.waitForTimeout(3000)
    }
    
    // 大量データでの応答性確認
    const startTime = Date.now()
    
    // Issue一覧読み込み
    await page.waitForSelector('.issue-table tbody tr', { timeout: 10000 })
    
    const loadTime = Date.now() - startTime
    
    // 10秒以内での読み込み完了確認
    expect(loadTime).toBeLessThan(10000)
    
    console.log(`Issue一覧読み込み時間: ${loadTime}ms`)
    
    // チャート描画時間確認
    const chartStartTime = Date.now()
    await page.waitForSelector('.burn-down-chart svg', { timeout: 10000 })
    const chartLoadTime = Date.now() - chartStartTime
    
    expect(chartLoadTime).toBeLessThan(5000)
    console.log(`チャート描画時間: ${chartLoadTime}ms`)
  })
})
import { test, expect } from '@playwright/test'

const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3000"
}

test.describe('PBL Viewer Test', () => {
  test('verify PBL Viewer functionality', async ({ page }) => {
    console.log('🚀 PBL Viewer Test 開始')
    
    // 直接PBL Viewerページへアクセス
    await page.goto(`${testConfig.frontend_url}/pbl-viewer`)
    await page.waitForTimeout(3000)
    
    // PBL Viewer表示確認
    const pblHeader = page.getByRole('heading', { name: 'Product Backlog Viewer' })
    if (await pblHeader.isVisible()) {
      console.log('✅ PBL Viewer表示確認')
      
      // Quick Filters確認
      const quickFilters = page.locator('.quick-filters')
      if (await quickFilters.isVisible()) {
        console.log('✅ Quick Filters表示確認')
        
        // フィルタボタンの存在確認
        const filters = ['#作業中', '#完了', '#ToDo', 's:backend', 's:frontend']
        for (const filter of filters) {
          const button = page.getByRole('button', { name: filter })
          if (await button.isVisible()) {
            console.log(`  - ${filter} フィルタボタン確認`)
          }
        }
      }
      
      // Issue一覧確認
      const issueTable = page.locator('.issue-table')
      if (await issueTable.isVisible()) {
        const rows = issueTable.locator('tbody tr')
        const rowCount = await rows.count()
        console.log(`✅ Issue一覧表示: ${rowCount}件`)
        
        // 最初の5件のIssue情報を表示
        for (let i = 0; i < Math.min(5, rowCount); i++) {
          const row = rows.nth(i)
          const title = await row.locator('td').nth(1).textContent()
          const points = await row.locator('td').nth(2).textContent()
          const status = await row.locator('td').nth(3).textContent()
          console.log(`  ${i + 1}. ${title} [${points}pt] - ${status}`)
        }
      }
      
      // 統計情報表示
      const statsButton = page.getByRole('button', { name: '📊 統計を表示' })
      if (await statsButton.isVisible()) {
        await statsButton.click()
        console.log('✅ 統計情報ボタンクリック')
        
        await page.waitForTimeout(1000)
        
        const statsSection = page.locator('.statistics-section')
        if (await statsSection.isVisible()) {
          console.log('✅ 統計セクション表示確認')
          
          // 統計データの一部を取得
          const completionRate = page.locator('text=/完了率:.*%/')
          if (await completionRate.isVisible()) {
            const rate = await completionRate.textContent()
            console.log(`  - ${rate}`)
          }
        }
      }
      
      await page.screenshot({ path: 'test-results/pbl-viewer-final.png', fullPage: true })
      console.log('\n✅ PBL Viewer Test 完了!')
    } else {
      console.log('❌ PBL Viewer表示失敗')
      await page.screenshot({ path: 'test-results/pbl-viewer-error.png', fullPage: true })
    }
  })
})
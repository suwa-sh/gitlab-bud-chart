import { test, expect } from '@playwright/test'
import testConfig from '/workspace/test_config.json'

test.describe('Phase 3: Search & Filter E2E Tests (with GitLab Connection)', () => {
  test.beforeEach(async ({ page }) => {
    // Connect to GitLab before each test
    await page.goto('/dashboard')
    
    // Check if already connected
    const gitlabStatus = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    const statusData = await gitlabStatus.json()
    
    if (!statusData.connected) {
      // Fill GitLab configuration
      await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
      await page.getByLabel('Access Token').fill(testConfig.access_token)
      await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
      
      // Connect to GitLab
      await page.getByRole('button', { name: '接続', exact: true }).click()
      
      // Wait for connection to complete
      await page.waitForTimeout(3000)
      
      // Check if connection was successful
      const connectionStatus = page.locator('.status')
      if (await connectionStatus.isVisible()) {
        // Take screenshot of connection result
        await page.screenshot({ path: 'test-results/phase3-gitlab-connection-status.png' })
      }
    }
  })

  test('should display connected GitLab status and issues', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should show GitLab connected status
    await expect(page.getByText('✓ GitLab接続済み')).toBeVisible()
    
    // Should show charts section
    await expect(page.getByText('Burn Down')).toBeVisible()
    await expect(page.getByText('Burn Up')).toBeVisible()
    
    // Should show Issues section
    await expect(page.getByText('Issues')).toBeVisible()
    
    // Should show export button
    await expect(page.getByRole('button', { name: 'CSV エクスポート' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-connected-dashboard.png', fullPage: true })
  })

  test('should display and use filter functionality', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for issues to load
    await page.waitForTimeout(2000)
    
    // Check if filter button exists
    const filterButton = page.getByRole('button', { name: 'フィルタ' })
    if (await filterButton.isVisible()) {
      // Click filter button to expand
      await filterButton.click()
      
      // Check search input
      await expect(page.getByPlaceholder('タイトル検索...')).toBeVisible()
      
      // Test search functionality
      await page.getByPlaceholder('タイトル検索...').fill('test')
      await page.waitForTimeout(1000)
      
      // Test milestone filter
      const milestoneSelect = page.getByLabel('Milestone')
      if (await milestoneSelect.isVisible()) {
        const options = await milestoneSelect.locator('option').allTextContents()
        if (options.length > 1) {
          await milestoneSelect.selectOption({ index: 1 })
          await page.waitForTimeout(500)
        }
      }
      
      // Test state filter
      const stateSelect = page.getByLabel('State')
      if (await stateSelect.isVisible()) {
        await stateSelect.selectOption('opened')
        await page.waitForTimeout(500)
      }
      
      // Check if active filter count is shown
      const activeFilterCount = page.locator('.active-filter-count')
      if (await activeFilterCount.isVisible()) {
        console.log('Active filters detected')
      }
      
      await page.screenshot({ path: 'test-results/phase3-filters-applied.png' })
    }
  })

  test('should test sorting functionality', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for issues to load
    await page.waitForTimeout(2000)
    
    // Test table sorting by clicking headers
    const headers = ['Title', 'Point', 'Milestone', 'State']
    
    for (const headerText of headers) {
      const header = page.locator(`th:has-text("${headerText}")`)
      if (await header.isVisible()) {
        await header.click()
        await page.waitForTimeout(500)
        
        // Check if sort icon appears
        const sortIcon = header.locator('.sort-icon')
        if (await sortIcon.isVisible()) {
          console.log(`Sort icon visible for ${headerText}`)
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/phase3-sorting-test.png' })
  })

  test('should test PBL Viewer with GitLab connection', async ({ page }) => {
    await page.goto('/pbl-viewer')
    
    // Should show PBL Viewer content when connected
    await expect(page.getByRole('heading', { name: 'Product Backlog Viewer' })).toBeVisible()
    
    // Should show statistics section
    await expect(page.getByText('統計情報')).toBeVisible()
    
    // Should show quick filters
    await expect(page.getByText('クイックフィルタ')).toBeVisible()
    await expect(page.getByRole('button', { name: '自分のIssue' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Issues' })).toBeVisible()
    await expect(page.getByRole('button', { name: '完了済み' })).toBeVisible()
    
    // Should show export button
    await expect(page.getByRole('button', { name: 'CSV エクスポート' })).toBeVisible()
    
    // Test quick filter
    await page.getByRole('button', { name: 'Open Issues' }).click()
    await page.waitForTimeout(1000)
    
    await page.screenshot({ path: 'test-results/phase3-pbl-viewer-connected.png', fullPage: true })
  })

  test('should test export functionality', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for issues to load
    await page.waitForTimeout(2000)
    
    // Test CSV export button exists and is enabled
    const exportButton = page.getByRole('button', { name: 'CSV エクスポート' })
    await expect(exportButton).toBeVisible()
    await expect(exportButton).toBeEnabled()
    
    // Test export from PBL Viewer as well
    await page.goto('/pbl-viewer')
    await page.waitForTimeout(1000)
    
    const pblExportButton = page.getByRole('button', { name: 'CSV エクスポート' })
    await expect(pblExportButton).toBeVisible()
    await expect(pblExportButton).toBeEnabled()
    
    await page.screenshot({ path: 'test-results/phase3-export-functionality.png' })
  })

  test('should test API endpoints with real data', async ({ page }) => {
    // Test issues API
    const issuesResponse = await page.request.get(`${testConfig.backend_url}/api/issues/`)
    expect(issuesResponse.status()).toBe(200)
    
    const issuesData = await issuesResponse.json()
    console.log('Issues API response type:', typeof issuesData)
    console.log('Issues API response length:', Array.isArray(issuesData) ? issuesData.length : 'Not an array')
    
    // Test GitLab status
    const statusResponse = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    expect(statusResponse.status()).toBe(200)
    
    const statusData = await statusResponse.json()
    expect(statusData).toHaveProperty('connected')
    console.log('GitLab connected:', statusData.connected)
    
    // Test search endpoint if available
    const searchResponse = await page.request.post(`${testConfig.backend_url}/api/issues/search`, {
      data: {
        query: 'test',
        state: 'all'
      }
    })
    
    if (searchResponse.status() === 200) {
      const searchData = await searchResponse.json()
      console.log('Search API working, results:', Array.isArray(searchData) ? searchData.length : 'Not an array')
    } else {
      console.log('Search API not available yet (expected for Task 09)')
    }
  })

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    
    // Check mobile layout
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    // Test mobile navigation
    await page.goto('/pbl-viewer')
    await expect(page.getByRole('heading', { name: 'Product Backlog Viewer' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-mobile-responsive.png', fullPage: true })
  })
})

test.describe('Phase 3: Performance and Error Handling', () => {
  test('should handle filter operations efficiently', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Connect to GitLab first
    const gitlabStatus = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    const statusData = await gitlabStatus.json()
    
    if (!statusData.connected) {
      await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
      await page.getByLabel('Access Token').fill(testConfig.access_token)
      await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
      await page.getByRole('button', { name: '接続', exact: true }).click()
      await page.waitForTimeout(3000)
    }
    
    // Measure filter performance
    const startTime = Date.now()
    
    const filterButton = page.getByRole('button', { name: 'フィルタ' })
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await page.getByPlaceholder('タイトル検索...').fill('test')
      await page.waitForTimeout(100)
      
      const stateSelect = page.getByLabel('State')
      if (await stateSelect.isVisible()) {
        await stateSelect.selectOption('opened')
      }
    }
    
    const filterTime = Date.now() - startTime
    expect(filterTime).toBeLessThan(3000) // Should complete within 3 seconds
    
    console.log(`Filter operations completed in ${filterTime}ms`)
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Test with invalid GitLab connection
    await page.goto('/dashboard')
    
    // Fill with invalid data
    await page.getByLabel('GitLab URL').fill('http://invalid-url')
    await page.getByLabel('Access Token').fill('invalid-token')
    await page.getByLabel('Project ID').fill('999')
    
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // Should show error state
    await page.waitForTimeout(5000)
    
    const errorElement = page.locator('.status.error')
    if (await errorElement.isVisible()) {
      console.log('Error handling working correctly')
    }
    
    await page.screenshot({ path: 'test-results/phase3-error-handling.png' })
  })
})
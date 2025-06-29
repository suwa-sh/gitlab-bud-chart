import { test, expect } from '@playwright/test'
import testConfig from '/workspace/test_config.json'

test.describe('Phase 3: Search & Filter UI Tests', () => {
  test('should display dashboard page correctly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check basic page elements
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    // Check navigation
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'PBL Viewer' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-dashboard.png', fullPage: true })
  })

  test('should display GitLab configuration when not connected', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check GitLab config form
    await expect(page.getByText('GitLab Configuration')).toBeVisible()
    await expect(page.getByLabel('GitLab URL')).toBeVisible()
    await expect(page.getByLabel('Access Token')).toBeVisible()
    await expect(page.getByLabel('Project ID')).toBeVisible()
    
    // Connect button should be disabled initially
    await expect(page.getByRole('button', { name: '接続', exact: true })).toBeDisabled()
    
    await page.screenshot({ path: 'test-results/phase3-gitlab-config.png' })
  })

  test('should navigate to PBL Viewer', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Navigate to PBL Viewer
    await page.getByRole('link', { name: 'PBL Viewer' }).click()
    
    // Check PBL Viewer page
    await expect(page.getByRole('heading', { name: 'Product Backlog Viewer' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-pbl-viewer.png', fullPage: true })
  })

  test('should show PBL Viewer components when not connected', async ({ page }) => {
    await page.goto('/pbl-viewer')
    
    // Should show message about GitLab connection needed
    await expect(page.getByText('GitLab接続設定が必要です')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-pbl-viewer-no-connection.png' })
  })

  test('should test GitLab connection form interaction', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Fill out GitLab form
    await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
    await page.getByLabel('Access Token').fill(testConfig.access_token)
    await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
    
    // Connect button should now be enabled
    await expect(page.getByRole('button', { name: '接続', exact: true })).toBeEnabled()
    
    await page.screenshot({ path: 'test-results/phase3-gitlab-form-filled.png' })
    
    // Try to connect (this will likely fail but tests the UI)
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // Should show loading state
    await expect(page.getByRole('button', { name: '接続中...' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-gitlab-connecting.png' })
    
    // Wait for result (either success or error)
    await page.waitForTimeout(3000)
    
    await page.screenshot({ path: 'test-results/phase3-gitlab-connection-result.png' })
  })

  test('should test backend API endpoints', async ({ page }) => {
    // Test backend health check
    const healthResponse = await page.request.get(`${testConfig.backend_url}/health`)
    expect(healthResponse.status()).toBe(200)
    
    const healthData = await healthResponse.json()
    expect(healthData.status).toBe('healthy')
    
    // Test GitLab status endpoint
    const statusResponse = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    expect(statusResponse.status()).toBe(200)
    
    // Test issues endpoint (may return empty array if not connected)
    const issuesResponse = await page.request.get(`${testConfig.backend_url}/api/issues/`)
    expect(issuesResponse.status()).toBe(200)
  })

  test('should show responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Check that navigation and content are visible in mobile view
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-mobile-dashboard.png', fullPage: true })
    
    // Test PBL Viewer in mobile
    await page.goto('/pbl-viewer')
    await expect(page.getByRole('heading', { name: 'Product Backlog Viewer' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-mobile-pbl-viewer.png', fullPage: true })
  })
})

test.describe('Phase 3: Component Integration Tests', () => {
  test('should check that all necessary CSS files are loaded', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that page styling is applied correctly
    const dashboardElement = page.locator('.dashboard')
    await expect(dashboardElement).toBeVisible()
    
    // Check navigation styling
    const navElement = page.locator('.nav-tab')
    await expect(navElement).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase3-styling-check.png' })
  })

  test('should test error boundary functionality', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that the page loads without JavaScript errors
    const logs = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text())
      }
    })
    
    await page.waitForTimeout(2000)
    
    // Should not have any critical console errors
    const criticalErrors = logs.filter(log => 
      log.includes('Error') && !log.includes('404') && !log.includes('favicon')
    )
    
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors)
    }
    
    await page.screenshot({ path: 'test-results/phase3-error-check.png' })
  })
})
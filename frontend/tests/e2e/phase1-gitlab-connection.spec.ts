import { test, expect } from '@playwright/test'
import testConfig from '/workspace/test_config.json'

test.describe('Phase 1: GitLab Connection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should show GitLab configuration form initially', async ({ page }) => {
    await expect(page.getByText('GitLab Configuration')).toBeVisible()
    await expect(page.getByLabel('GitLab URL')).toBeVisible()
    await expect(page.getByLabel('Access Token')).toBeVisible()
    await expect(page.getByLabel('Project ID')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-gitlab-config-form.png' })
  })

  test('should validate required fields', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: '接続', exact: true })
    await expect(connectButton).toBeDisabled()
    
    // Fill URL only
    await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
    await expect(connectButton).toBeDisabled()
    
    // Fill token
    await page.getByLabel('Access Token').fill(testConfig.access_token)
    await expect(connectButton).toBeDisabled()
    
    // Fill project ID
    await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
    await expect(connectButton).toBeEnabled()
    
    await page.screenshot({ path: 'test-results/phase1-form-validation.png' })
  })

  test('should handle connection error gracefully', async ({ page }) => {
    await page.getByLabel('GitLab URL').fill('http://invalid-url')
    await page.getByLabel('Access Token').fill('invalid-token')
    await page.getByLabel('Project ID').fill('999')
    
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // Wait for error message
    await expect(page.locator('.status.error')).toBeVisible({ timeout: 10000 })
    
    await page.screenshot({ path: 'test-results/phase1-connection-error.png' })
  })

  test('should test connection status endpoint', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('connected')
  })

  test('should navigate between dashboard and pbl viewer', async ({ page }) => {
    // Test navigation
    await page.getByRole('link', { name: 'PBL Viewer' }).click()
    await expect(page.getByRole('heading', { name: 'PBL Viewer' })).toBeVisible()
    
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-navigation.png' })
  })

  test('should display API documentation', async ({ page }) => {
    await page.goto(`${testConfig.backend_url}/docs`)
    await expect(page.getByText('GitLab Bud Chart API')).toBeVisible()
    await page.screenshot({ path: 'test-results/phase1-api-docs.png' })
  })
})

test.describe('Phase 1: API Integration Tests', () => {
  test('backend health check', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/health`)
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })

  test('issues API basic response', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/api/issues/`)
    expect(response.status()).toBe(200)
    
    const issues = await response.json()
    expect(Array.isArray(issues)).toBe(true)
  })

  test('charts API basic response', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/api/charts/burn-down?milestone=v1.0&start_date=2024-01-01&end_date=2024-12-31`)
    expect(response.status()).toBe(200)
    
    const chartData = await response.json()
    expect(Array.isArray(chartData)).toBe(true)
  })

  test('gitlab status API', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    expect(response.status()).toBe(200)
    
    const status = await response.json()
    expect(status).toHaveProperty('connected')
  })

  test('gitlab connect API structure', async ({ page }) => {
    // Test with invalid data to check error handling
    const response = await page.request.post(`${testConfig.backend_url}/api/gitlab/connect`, {
      data: {
        gitlab_url: 'http://invalid-url',
        gitlab_token: 'invalid-token',
        project_id: '999'
      }
    })
    
    // Should return 400 for invalid connection
    expect(response.status()).toBe(400)
    
    const errorData = await response.json()
    expect(errorData).toHaveProperty('detail')
  })
})

test.describe('Phase 1: UI Interaction Tests', () => {
  test('should show loading state during connection', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Fill form with invalid data to test loading state
    await page.getByLabel('GitLab URL').fill(testConfig.gitlab_url)
    await page.getByLabel('Access Token').fill(testConfig.access_token)
    await page.getByLabel('Project ID').fill(testConfig.project_id.toString())
    
    // Click connect and immediately check for loading state
    await page.getByRole('button', { name: '接続', exact: true }).click()
    
    // Should show loading text on button
    await expect(page.getByRole('button', { name: '接続中...' })).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-loading-state.png' })
  })

  test('should allow configuration changes', async ({ page }) => {
    // Skip this test if not connected (since we can't actually connect in CI)
    const statusResponse = await page.request.get(`${testConfig.backend_url}/api/gitlab/status`)
    const statusData = await statusResponse.json()
    
    if (!statusData.connected) {
      test.skip()
    }
    
    // If connected, test the configuration change button
    await expect(page.getByText('✅ GitLab接続済み')).toBeVisible()
    
    await page.getByRole('button', { name: '設定変更' }).click()
    
    // Should show configuration form again
    await expect(page.getByText('GitLab Configuration')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-config-change.png' })
  })
})
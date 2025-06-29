import { test, expect } from '@playwright/test'
import testConfig from '/workspace/test_config.json'

test.describe('Basic App Functionality', () => {
  test('should load homepage and display dashboard', async ({ page }) => {
    await page.goto('/')
    
    // Check title
    await expect(page).toHaveTitle(/GitLab Bud Chart/)
    
    // Check if dashboard content is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('GitLab Config:')).toBeVisible()
    await expect(page.getByText('Period:')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true })
  })

  test('should navigate between dashboard and pbl viewer', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check dashboard is active
    await expect(page.locator('.nav-tab.active')).toHaveText('Dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    // Navigate to PBL Viewer
    await page.click('text=PBL Viewer')
    
    // Check PBL Viewer is now active
    await expect(page.locator('.nav-tab.active')).toHaveText('PBL Viewer')
    await expect(page.getByRole('heading', { name: 'PBL Viewer' })).toBeVisible()
    
    // Take screenshots
    await page.screenshot({ path: 'test-results/pbl-viewer.png', fullPage: true })
  })

  test('should display issues table', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check if issues table is visible
    await expect(page.locator('.issues-table')).toBeVisible()
    await expect(page.getByText('Issues')).toBeVisible()
    
    // Check table headers
    await expect(page.getByText('MILESTONE')).toBeVisible()
    await expect(page.getByText('TITLE')).toBeVisible()
    await expect(page.getByText('POINT')).toBeVisible()
    await expect(page.getByText('KANBAN STATUS')).toBeVisible()
    
    // Check sample data
    await expect(page.getByRole('cell', { name: 'v1.0' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Issue1' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '1.0', exact: true })).toBeVisible()
  })

  test('should display chart placeholders', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check chart containers
    await expect(page.getByText('Burn Down')).toBeVisible()
    await expect(page.getByText('Burn Up')).toBeVisible()
    await expect(page.getByText('Chart will be here').first()).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true })
  })
})

test.describe('API Integration', () => {
  test('should connect to backend API', async ({ page }) => {
    // Backend health check
    const response = await page.request.get(`${testConfig.backend_url}/health`)
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })

  test('should get issues from API', async ({ page }) => {
    const response = await page.request.get(`${testConfig.backend_url}/api/issues/`)
    expect(response.status()).toBe(200)
    const issues = await response.json()
    expect(Array.isArray(issues)).toBe(true)
    expect(issues.length).toBeGreaterThan(0)
    
    // Check sample issue structure
    const sampleIssue = issues[0]
    expect(sampleIssue).toHaveProperty('id')
    expect(sampleIssue).toHaveProperty('title')
    expect(sampleIssue).toHaveProperty('state')
    expect(sampleIssue).toHaveProperty('assignee')
    expect(sampleIssue).toHaveProperty('milestone')
  })
})
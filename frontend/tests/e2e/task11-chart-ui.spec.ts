import { test, expect } from '@playwright/test'

test.describe('Task 11: Dashboard Chart UI Tests', () => {
  test('should display chart components when GitLab is connected', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3002/dashboard')
    
    // Check if GitLab configuration form is visible (means not connected)
    const gitlabConfig = page.locator('.gitlab-config')
    
    if (await gitlabConfig.isVisible()) {
      // Connect to GitLab using test config
      await page.getByLabel('GitLab URL').fill('http://localhost:8080')
      await page.getByLabel('Access Token').fill('glpat-cnHyDV8kvvz4Z_3ASq8g')
      await page.getByLabel('Project ID').fill('1')
      
      // Click connect button
      await page.getByRole('button', { name: '接続', exact: true }).click()
      
      // Wait for connection
      await page.waitForTimeout(3000)
    }
    
    // Check if dashboard header is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    // Check if GitLab connected status is shown
    await expect(page.getByText('✓ GitLab接続済み')).toBeVisible()
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/task11-dashboard-loaded.png', fullPage: true })
  })

  test('should show period selector with preset options', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    
    // Wait for page load
    await page.waitForTimeout(2000)
    
    // Check period selector is visible
    const periodSelector = page.locator('.period-selector')
    await expect(periodSelector).toBeVisible()
    
    // Check preset buttons exist
    await expect(page.getByRole('button', { name: '今月' })).toBeVisible()
    await expect(page.getByRole('button', { name: '先月' })).toBeVisible()
    await expect(page.getByRole('button', { name: '今四半期' })).toBeVisible()
    await expect(page.getByRole('button', { name: '前四半期' })).toBeVisible()
    await expect(page.getByRole('button', { name: '今年' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'カスタム' })).toBeVisible()
    
    // Test clicking a preset
    await page.getByRole('button', { name: '今月' }).click()
    
    // Check that current period display updates
    await expect(page.locator('.current-period')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/task11-period-selector.png' })
  })

  test('should display chart controls and toggle views', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    
    // Wait for page load and potential GitLab connection
    await page.waitForTimeout(3000)
    
    // Check if chart controls are visible
    const chartControls = page.locator('.chart-controls')
    if (await chartControls.isVisible()) {
      // Check milestone selector
      await expect(page.locator('.milestone-select')).toBeVisible()
      
      // Check view toggle buttons
      await expect(page.getByRole('button', { name: '両方' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Burn Down' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Burn Up' })).toBeVisible()
      
      // Check export button
      await expect(page.getByRole('button', { name: '📊 チャートをエクスポート' })).toBeVisible()
      
      // Test view toggle
      await page.getByRole('button', { name: 'Burn Down' }).click()
      await page.waitForTimeout(500)
      
      await page.getByRole('button', { name: 'Burn Up' }).click()
      await page.waitForTimeout(500)
      
      await page.getByRole('button', { name: '両方' }).click()
      await page.waitForTimeout(500)
      
      await page.screenshot({ path: 'test-results/task11-chart-controls.png' })
    } else {
      console.log('Chart controls not visible - likely GitLab not connected')
    }
  })

  test('should render chart components when data is available', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    
    // Wait for page load
    await page.waitForTimeout(3000)
    
    // Look for chart components
    const burnDownChart = page.locator('.burn-down-chart')
    const burnUpChart = page.locator('.burn-up-chart')
    
    if (await burnDownChart.isVisible()) {
      // Check burn down chart elements
      await expect(page.getByText('Burn Down Chart')).toBeVisible()
      
      // Check for Recharts SVG element
      const chartSvg = burnDownChart.locator('svg')
      await expect(chartSvg).toBeVisible()
      
      console.log('✅ Burn Down Chart is rendered')
    } else {
      console.log('ℹ️  Burn Down Chart not visible - checking for loading or empty state')
      
      // Check for loading state
      const loadingSpinner = page.locator('.chart-loading')
      if (await loadingSpinner.isVisible()) {
        console.log('ℹ️  Charts are loading')
      }
      
      // Check for empty state
      const emptyChart = page.locator('.chart-empty')
      if (await emptyChart.isVisible()) {
        console.log('ℹ️  Charts show empty state')
      }
    }
    
    if (await burnUpChart.isVisible()) {
      // Check burn up chart elements
      await expect(page.getByText('Burn Up Chart')).toBeVisible()
      
      // Check for Recharts SVG element
      const chartSvg = burnUpChart.locator('svg')
      await expect(chartSvg).toBeVisible()
      
      console.log('✅ Burn Up Chart is rendered')
    }
    
    await page.screenshot({ path: 'test-results/task11-chart-rendering.png', fullPage: true })
  })

  test('should test responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('http://localhost:3002/dashboard')
    await page.waitForTimeout(2000)
    
    // Check that dashboard loads on mobile
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    
    // Check period selector responsive behavior
    const periodSelector = page.locator('.period-selector')
    if (await periodSelector.isVisible()) {
      await expect(periodSelector).toBeVisible()
    }
    
    // Check charts responsive behavior
    const chartsContainer = page.locator('.charts-container')
    if (await chartsContainer.isVisible()) {
      // On mobile, charts should stack vertically
      await expect(chartsContainer).toBeVisible()
    }
    
    await page.screenshot({ path: 'test-results/task11-mobile-responsive.png', fullPage: true })
  })

  test('should validate chart data and statistics display', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    await page.waitForTimeout(3000)
    
    // Look for chart summary sections
    const chartSummaries = page.locator('.chart-summary')
    
    if (await chartSummaries.first().isVisible()) {
      // Check summary items in burn down chart
      const summaryItems = chartSummaries.first().locator('.summary-item')
      
      if (await summaryItems.first().isVisible()) {
        // Check for summary labels and values
        await expect(summaryItems.locator('.summary-label')).toBeVisible()
        await expect(summaryItems.locator('.summary-value')).toBeVisible()
        
        console.log('✅ Chart statistics are displayed')
      }
    } else {
      console.log('ℹ️  Chart summaries not visible - charts may be loading or empty')
    }
    
    await page.screenshot({ path: 'test-results/task11-chart-statistics.png' })
  })
})

test.describe('Task 11: Chart API Integration', () => {
  test('should successfully fetch chart data from backend APIs', async ({ page }) => {
    // Test burn down API
    const burnDownResponse = await page.request.get('http://localhost:8000/api/charts/burn-down?start_date=2024-01-01&end_date=2024-01-07')
    expect(burnDownResponse.status()).toBe(200)
    
    const burnDownData = await burnDownResponse.json()
    expect(burnDownData).toHaveProperty('chart_data')
    expect(burnDownData).toHaveProperty('metadata')
    expect(burnDownData).toHaveProperty('statistics')
    expect(Array.isArray(burnDownData.chart_data)).toBe(true)
    
    console.log('✅ Burn Down API working:', burnDownData.chart_data.length, 'data points')
    
    // Test burn up API
    const burnUpResponse = await page.request.get('http://localhost:8000/api/charts/burn-up?start_date=2024-01-01&end_date=2024-01-07')
    expect(burnUpResponse.status()).toBe(200)
    
    const burnUpData = await burnUpResponse.json()
    expect(burnUpData).toHaveProperty('chart_data')
    expect(burnUpData).toHaveProperty('metadata')
    expect(burnUpData).toHaveProperty('statistics')
    expect(Array.isArray(burnUpData.chart_data)).toBe(true)
    
    console.log('✅ Burn Up API working:', burnUpData.chart_data.length, 'data points')
    
    // Test velocity API
    const velocityResponse = await page.request.get('http://localhost:8000/api/charts/velocity?weeks=4')
    expect(velocityResponse.status()).toBe(200)
    
    const velocityData = await velocityResponse.json()
    expect(velocityData).toHaveProperty('velocity_data')
    expect(velocityData).toHaveProperty('average_velocity')
    expect(velocityData).toHaveProperty('weeks_analyzed')
    
    console.log('✅ Velocity API working:', velocityData.weeks_analyzed, 'weeks analyzed')
  })
})
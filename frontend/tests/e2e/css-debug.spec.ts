import { test, expect } from '@playwright/test'

test.describe('CSS Debug Tests', () => {
  test('should check CSS loading and take screenshots', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Navigate to homepage
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Take screenshot of homepage
    await page.screenshot({ 
      path: 'test-results/css-debug-homepage.png',
      fullPage: true 
    })
    
    // Check for CSS files in network
    const cssRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('.css')) {
        cssRequests.push(request.url())
      }
    })
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: 'test-results/css-debug-dashboard.png',
      fullPage: true 
    })
    
    // Navigate to PBL viewer
    await page.goto('/pbl-viewer')
    await page.waitForTimeout(1000)
    
    // Take screenshot of PBL viewer
    await page.screenshot({ 
      path: 'test-results/css-debug-pbl-viewer.png',
      fullPage: true 
    })
    
    // Check computed styles
    const navTabsStyles = await page.evaluate(() => {
      const element = document.querySelector('.nav-tabs')
      if (!element) return null
      const styles = window.getComputedStyle(element)
      return {
        display: styles.display,
        borderBottom: styles.borderBottom,
        marginBottom: styles.marginBottom
      }
    })
    
    const dashboardStyles = await page.evaluate(() => {
      const element = document.querySelector('.dashboard')
      if (!element) return null
      const styles = window.getComputedStyle(element)
      return {
        padding: styles.padding,
        maxWidth: styles.maxWidth,
        margin: styles.margin
      }
    })
    
    console.log('Console Errors:', consoleErrors)
    console.log('CSS Requests:', cssRequests)
    console.log('Nav Tabs Styles:', navTabsStyles)
    console.log('Dashboard Styles:', dashboardStyles)
    
    // Log findings
    await page.evaluate((data) => {
      console.log('Debug Info:', JSON.stringify(data, null, 2))
    }, {
      consoleErrors,
      cssRequests,
      navTabsStyles,
      dashboardStyles
    })
  })
})
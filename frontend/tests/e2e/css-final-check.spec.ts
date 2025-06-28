import { test, expect } from '@playwright/test'

test.describe('Final CSS Check', () => {
  test('should display improved UI with proper styling', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)
    
    // Take screenshot of improved dashboard
    await page.screenshot({ 
      path: 'test-results/final-dashboard.png',
      fullPage: true 
    })
    
    // Check if nav tab is active
    const activeTab = await page.locator('.nav-tab.active')
    await expect(activeTab).toHaveText('Dashboard')
    
    // Navigate to PBL viewer
    await page.click('text=PBL Viewer')
    await page.waitForTimeout(1000)
    
    // Take screenshot of improved PBL viewer
    await page.screenshot({ 
      path: 'test-results/final-pbl-viewer.png',
      fullPage: true 
    })
    
    // Check if nav tab is active
    const activePblTab = await page.locator('.nav-tab.active')
    await expect(activePblTab).toHaveText('PBL Viewer')
    
    // Check styling elements
    const navTabs = await page.locator('.nav-tabs')
    await expect(navTabs).toBeVisible()
    
    const issuesTable = await page.locator('.issues-table')
    await expect(issuesTable).toBeVisible()
    
    // Check computed styles for improved design
    const appStyles = await page.evaluate(() => {
      const app = document.querySelector('.App')
      const navTabs = document.querySelector('.nav-tabs')
      const dashboard = document.querySelector('.pbl-viewer')
      
      if (!app || !navTabs || !dashboard) return null
      
      return {
        appBackground: window.getComputedStyle(app).backgroundColor,
        navBackground: window.getComputedStyle(navTabs).backgroundColor,
        navBoxShadow: window.getComputedStyle(navTabs).boxShadow,
        dashboardPadding: window.getComputedStyle(dashboard).padding,
        dashboardMaxWidth: window.getComputedStyle(dashboard).maxWidth
      }
    })
    
    console.log('Final App Styles:', appStyles)
    
    expect(appStyles?.appBackground).toBe('rgb(248, 249, 250)')
    expect(appStyles?.navBackground).toBe('rgb(255, 255, 255)')
  })
})
import { test, expect } from '@playwright/test'

const testConfig = {
  gitlab_url: "http://localhost:8080",
  project_id: 1,
  access_token: "glpat-cnHyDV8kvvz4Z_3ASq8g",
  backend_url: "http://localhost:8000",
  frontend_url: "http://localhost:3002"
}

test.describe('GitLab Connection Debug', () => {
  test('debug GitLab connection process step by step', async ({ page }) => {
    // コンソールログを監視
    page.on('console', msg => console.log('ブラウザコンソール:', msg.type(), msg.text()))
    page.on('pageerror', error => console.log('ページエラー:', error.message))
    
    // ネットワークリクエストを監視
    const requests: string[] = []
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`)
      console.log('リクエスト:', request.method(), request.url())
    })
    
    page.on('response', response => {
      console.log('レスポンス:', response.status(), response.url())
    })
    
    // 1. フロントエンドアクセス確認
    console.log('1. アクセス開始:', testConfig.frontend_url)
    await page.goto(`${testConfig.frontend_url}/dashboard`)
    
    // 2. 初期状態の確認
    await page.screenshot({ path: 'test-results/debug-01-initial.png' })
    
    // 3. GitLab設定フォームの確認
    await expect(page.getByText('GitLab Configuration')).toBeVisible()
    console.log('2. GitLab Configuration フォーム表示確認')
    
    // 4. フォームの初期値を確認
    const urlValue = await page.getByLabel('GitLab URL').inputValue()
    const tokenValue = await page.getByLabel('Access Token').inputValue()
    const projectValue = await page.getByLabel('Project ID').inputValue()
    console.log('3. フォーム初期値:', { url: urlValue, token: tokenValue.substring(0, 10) + '...', project: projectValue })
    
    // 5. ボタンの状態を確認
    const connectButton = page.getByRole('button', { name: '接続', exact: true })
    const isDisabled = await connectButton.isDisabled()
    console.log('4. 接続ボタン状態:', isDisabled ? 'disabled' : 'enabled')
    
    await page.screenshot({ path: 'test-results/debug-02-form-state.png' })
    
    // 6. ボタンクリック前にネットワーク監視開始
    let responseReceived = false
    page.on('response', response => {
      if (response.url().includes('/api/gitlab/connect')) {
        responseReceived = true
        console.log('6. GitLab接続API レスポンス:', response.status())
      }
    })
    
    // 7. 接続ボタンクリック
    console.log('5. 接続ボタンクリック')
    await connectButton.click()
    
    // 8. 短時間待機してリクエスト発生を確認
    await page.waitForTimeout(3000)
    console.log('7. 3秒経過後 - レスポンス受信:', responseReceived)
    console.log('8. 発生したリクエスト:', requests.filter(r => r.includes('gitlab')))
    
    await page.screenshot({ path: 'test-results/debug-03-after-click.png' })
    
    // 9. フォームの状態を確認
    const statusElement = page.locator('.status')
    const errorElement = page.locator('.error')
    
    if (await statusElement.isVisible()) {
      const statusText = await statusElement.textContent()
      console.log('9. ステータス表示:', statusText)
    }
    
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      console.log('10. エラー表示:', errorText)
    }
    
    await page.screenshot({ path: 'test-results/debug-04-final.png' })
  })
  
  test('test backend API directly', async ({ request }) => {
    console.log('Backend API直接テスト開始')
    
    const response = await request.post(`${testConfig.backend_url}/api/gitlab/connect`, {
      data: {
        gitlab_url: testConfig.gitlab_url,
        gitlab_token: testConfig.access_token,
        project_id: testConfig.project_id.toString()
      }
    })
    
    console.log('API Status:', response.status())
    const responseBody = await response.json()
    console.log('API Response:', JSON.stringify(responseBody, null, 2))
    
    expect(response.status()).toBe(200)
    expect(responseBody.success).toBe(true)
  })
})
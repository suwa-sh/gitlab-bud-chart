# Task 03: GitLab API接続設定・基本テスト

## 概要
GitLab API接続・認証設定を実装し、基本的なAPI呼び出しテストとE2Eテストを実行してPhase 1を完了する。

## 目的
- GitLab API接続設定実装
- 認証機能実装（Token認証）
- 基本API呼び出しテスト実装
- Phase 1完了 E2Eテスト実行

## 前提条件
- Task 02完了（開発環境構築済み）
- Self-hosted GitLab環境へのアクセス準備
- GitLab Personal Access Token取得済み

## 作業手順

### 1. GitLab接続設定実装

#### 1.1 GitLab設定管理
**backend/app/services/gitlab_client.py**:
```python
import gitlab
from typing import Optional, List, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class GitLabClient:
    def __init__(self):
        self.gl: Optional[gitlab.Gitlab] = None
        self.project = None
        
    def connect(self, gitlab_url: str, gitlab_token: str, project_id: str) -> bool:
        """GitLab接続"""
        try:
            self.gl = gitlab.Gitlab(gitlab_url, private_token=gitlab_token)
            self.gl.auth()
            self.project = self.gl.projects.get(project_id)
            logger.info(f"GitLab接続成功: {gitlab_url}, project: {project_id}")
            return True
        except Exception as e:
            logger.error(f"GitLab接続失敗: {e}")
            self.gl = None
            self.project = None
            return False
    
    def test_connection(self) -> Dict[str, Any]:
        """接続テスト"""
        if not self.gl or not self.project:
            return {
                "connected": False,
                "error": "GitLab接続が設定されていません"
            }
        
        try:
            # プロジェクト情報取得テスト
            project_info = {
                "id": self.project.id,
                "name": self.project.name,
                "description": self.project.description,
                "web_url": self.project.web_url,
                "issues_enabled": self.project.issues_enabled,
                "open_issues_count": self.project.open_issues_count
            }
            
            return {
                "connected": True,
                "project": project_info,
                "user": self.gl.user.name if self.gl.user else "Unknown"
            }
        except Exception as e:
            logger.error(f"GitLab接続テスト失敗: {e}")
            return {
                "connected": False,
                "error": str(e)
            }
    
    def get_issues_sample(self, limit: int = 5) -> List[Dict[str, Any]]:
        """サンプルissue取得（動作確認用）"""
        if not self.gl or not self.project:
            return []
        
        try:
            issues = self.project.issues.list(per_page=limit, state='all')
            return [
                {
                    "id": issue.id,
                    "title": issue.title,
                    "state": issue.state,
                    "created_at": issue.created_at,
                    "labels": issue.labels,
                    "assignee": issue.assignee['name'] if issue.assignee else None,
                    "milestone": issue.milestone['title'] if issue.milestone else None
                }
                for issue in issues
            ]
        except Exception as e:
            logger.error(f"Issues取得失敗: {e}")
            return []

# グローバルインスタンス
gitlab_client = GitLabClient()
```

#### 1.2 GitLab設定API実装
**backend/app/api/gitlab_config.py**:
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.gitlab_client import gitlab_client
from typing import Dict, Any

router = APIRouter()

class GitLabConfigRequest(BaseModel):
    gitlab_url: str
    gitlab_token: str
    project_id: str

class GitLabConfigResponse(BaseModel):
    success: bool
    message: str
    project_info: Dict[str, Any] = {}

@router.post("/connect", response_model=GitLabConfigResponse)
async def connect_gitlab(config: GitLabConfigRequest):
    """GitLab接続設定"""
    success = gitlab_client.connect(
        config.gitlab_url,
        config.gitlab_token,
        config.project_id
    )
    
    if success:
        test_result = gitlab_client.test_connection()
        if test_result["connected"]:
            return GitLabConfigResponse(
                success=True,
                message="GitLab接続成功",
                project_info=test_result
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"GitLab接続テスト失敗: {test_result.get('error', 'Unknown error')}"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="GitLab接続失敗"
        )

@router.get("/status")
async def get_gitlab_status():
    """GitLab接続状態確認"""
    test_result = gitlab_client.test_connection()
    return test_result

@router.get("/issues/sample")
async def get_sample_issues():
    """サンプルissue取得（動作確認用）"""
    issues = gitlab_client.get_issues_sample()
    return {
        "count": len(issues),
        "issues": issues
    }
```

**backend/app/main.py** にルーター追加:
```python
from app.api import gitlab_config

app.include_router(gitlab_config.router, prefix="/api/gitlab", tags=["gitlab"])
```

#### 1.3 フロントエンド GitLab設定UI実装

**frontend/src/components/GitLabConfig/GitLabConfig.tsx**:
```tsx
import { useState } from 'react'
import { gitlabApi } from '../../services/api'

interface GitLabConfigProps {
  onConfigured?: () => void
}

export const GitLabConfig = ({ onConfigured }: GitLabConfigProps) => {
  const [config, setConfig] = useState({
    gitlab_url: 'http://localhost:8080',
    gitlab_token: '',
    project_id: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')
    setStatus('接続中...')
    
    try {
      const result = await gitlabApi.connect(config)
      setStatus(`接続成功: ${result.project_info.project?.name}`)
      onConfigured?.()
    } catch (err: any) {
      setError(err.response?.data?.detail || '接続に失敗しました')
      setStatus('')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const status = await gitlabApi.getStatus()
      if (status.connected) {
        setStatus(`接続確認済み: ${status.project?.name}`)
        setError('')
      } else {
        setError(status.error || '接続されていません')
        setStatus('')
      }
    } catch (err: any) {
      setError('接続状態確認に失敗しました')
      setStatus('')
    }
  }

  return (
    <div className="gitlab-config">
      <h3>GitLab Configuration</h3>
      
      <div className="config-form">
        <div className="form-group">
          <label>GitLab URL:</label>
          <input
            type="text"
            value={config.gitlab_url}
            onChange={(e) => setConfig(prev => ({ ...prev, gitlab_url: e.target.value }))}
            placeholder="http://localhost:8080"
          />
        </div>
        
        <div className="form-group">
          <label>Access Token:</label>
          <input
            type="password"
            value={config.gitlab_token}
            onChange={(e) => setConfig(prev => ({ ...prev, gitlab_token: e.target.value }))}
            placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
          />
        </div>
        
        <div className="form-group">
          <label>Project ID:</label>
          <input
            type="text"
            value={config.project_id}
            onChange={(e) => setConfig(prev => ({ ...prev, project_id: e.target.value }))}
            placeholder="1"
          />
        </div>
        
        <div className="form-actions">
          <button 
            onClick={handleConnect} 
            disabled={isConnecting || !config.gitlab_token || !config.project_id}
          >
            {isConnecting ? '接続中...' : '接続'}
          </button>
          
          <button onClick={handleTestConnection}>
            接続確認
          </button>
        </div>
      </div>
      
      {status && (
        <div className="status success">
          {status}
        </div>
      )}
      
      {error && (
        <div className="status error">
          {error}
        </div>
      )}
    </div>
  )
}
```

**frontend/src/services/api.ts** にGitLab API追加:
```typescript
export const gitlabApi = {
  connect: async (config: {
    gitlab_url: string
    gitlab_token: string
    project_id: string
  }) => {
    const response = await api.post('/gitlab/connect', config)
    return response.data
  },
  
  getStatus: async () => {
    const response = await api.get('/gitlab/status')
    return response.data
  },
  
  getSampleIssues: async () => {
    const response = await api.get('/gitlab/issues/sample')
    return response.data
  },
}
```

#### 1.4 Dashboard画面にGitLab設定統合

**frontend/src/components/Dashboard/Dashboard.tsx** 更新:
```tsx
import { useState, useEffect } from 'react'
import { GitLabConfig } from '../GitLabConfig/GitLabConfig'
import { gitlabApi } from '../../services/api'

export const Dashboard = () => {
  const [isConfigured, setIsConfigured] = useState(false)
  const [sampleIssues, setSampleIssues] = useState<any[]>([])

  useEffect(() => {
    checkGitLabStatus()
  }, [])

  const checkGitLabStatus = async () => {
    try {
      const status = await gitlabApi.getStatus()
      setIsConfigured(status.connected)
      
      if (status.connected) {
        const issues = await gitlabApi.getSampleIssues()
        setSampleIssues(issues.issues)
      }
    } catch (err) {
      setIsConfigured(false)
    }
  }

  const handleConfigured = () => {
    setIsConfigured(true)
    checkGitLabStatus()
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {!isConfigured ? (
        <GitLabConfig onConfigured={handleConfigured} />
      ) : (
        <>
          <div className="config-section">
            <p>✅ GitLab接続済み</p>
            <button onClick={() => setIsConfigured(false)}>設定変更</button>
          </div>
          
          <div className="period-section">
            <p>Period: 2025-04 ~ 2025-06</p>
          </div>
          
          <div className="charts-section">
            <div className="chart-container">
              <h2>Burn Down</h2>
              <div className="chart-placeholder">Chart will be here</div>
            </div>
            
            <div className="chart-container">
              <h2>Burn Up</h2>
              <div className="chart-placeholder">Chart will be here</div>
            </div>
          </div>
          
          <div className="issues-section">
            <h2>Issues (Sample Data)</h2>
            <table className="issues-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>State</th>
                  <th>Assignee</th>
                  <th>Milestone</th>
                  <th>Labels</th>
                </tr>
              </thead>
              <tbody>
                {sampleIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.id}</td>
                    <td>{issue.title}</td>
                    <td>{issue.state}</td>
                    <td>{issue.assignee || '-'}</td>
                    <td>{issue.milestone || '-'}</td>
                    <td>{issue.labels.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
```

### 2. テスト実装

#### 2.1 Backend GitLab接続テスト

**backend/tests/test_gitlab_client.py**:
```python
import pytest
from unittest.mock import Mock, patch
from app.services.gitlab_client import GitLabClient

class TestGitLabClient:
    @patch('gitlab.Gitlab')
    def test_connect_success(self, mock_gitlab):
        # Mock設定
        mock_gl = Mock()
        mock_project = Mock()
        mock_gitlab.return_value = mock_gl
        mock_gl.projects.get.return_value = mock_project
        
        client = GitLabClient()
        result = client.connect("http://localhost:8080", "token", "1")
        
        assert result is True
        assert client.gl == mock_gl
        assert client.project == mock_project
    
    @patch('gitlab.Gitlab')
    def test_connect_failure(self, mock_gitlab):
        mock_gitlab.side_effect = Exception("Connection failed")
        
        client = GitLabClient()
        result = client.connect("http://localhost:8080", "token", "1")
        
        assert result is False
        assert client.gl is None
        assert client.project is None
    
    def test_test_connection_not_connected(self):
        client = GitLabClient()
        result = client.test_connection()
        
        assert result["connected"] is False
        assert "GitLab接続が設定されていません" in result["error"]

@pytest.mark.asyncio
async def test_gitlab_connect_api():
    from httpx import AsyncClient
    from app.main import app
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 無効な設定でテスト
        response = await ac.post("/api/gitlab/connect", json={
            "gitlab_url": "http://invalid",
            "gitlab_token": "invalid",
            "project_id": "1"
        })
        assert response.status_code == 400
```

#### 2.2 Frontend GitLab設定テスト

**frontend/src/components/GitLabConfig/GitLabConfig.test.tsx**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitLabConfig } from './GitLabConfig'
import { gitlabApi } from '../../services/api'

// Mock API
jest.mock('../../services/api')
const mockGitlabApi = gitlabApi as jest.Mocked<typeof gitlabApi>

describe('GitLabConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders config form', () => {
    render(<GitLabConfig />)
    
    expect(screen.getByLabelText(/GitLab URL/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Access Token/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Project ID/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /接続/i })).toBeInTheDocument()
  })

  test('successful connection', async () => {
    const mockResponse = {
      success: true,
      message: '接続成功',
      project_info: {
        project: { name: 'Test Project' }
      }
    }
    mockGitlabApi.connect.mockResolvedValue(mockResponse)

    render(<GitLabConfig />)
    
    fireEvent.change(screen.getByLabelText(/GitLab URL/i), {
      target: { value: 'http://localhost:8080' }
    })
    fireEvent.change(screen.getByLabelText(/Access Token/i), {
      target: { value: 'token123' }
    })
    fireEvent.change(screen.getByLabelText(/Project ID/i), {
      target: { value: '1' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /接続/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/接続成功: Test Project/i)).toBeInTheDocument()
    })
  })
})
```

### 3. Phase 1完了 E2Eテスト

#### 3.1 GitLab接続E2Eテスト

**frontend/tests/e2e/phase1-gitlab-connection.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

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
    const connectButton = page.getByRole('button', { name: '接続' })
    await expect(connectButton).toBeDisabled()
    
    // Fill URL only
    await page.getByLabel('GitLab URL').fill('http://localhost:8080')
    await expect(connectButton).toBeDisabled()
    
    // Fill token
    await page.getByLabel('Access Token').fill('test-token')
    await expect(connectButton).toBeDisabled()
    
    // Fill project ID
    await page.getByLabel('Project ID').fill('1')
    await expect(connectButton).toBeEnabled()
    
    await page.screenshot({ path: 'test-results/phase1-form-validation.png' })
  })

  test('should handle connection error gracefully', async ({ page }) => {
    await page.getByLabel('GitLab URL').fill('http://invalid-url')
    await page.getByLabel('Access Token').fill('invalid-token')
    await page.getByLabel('Project ID').fill('999')
    
    await page.getByRole('button', { name: '接続' }).click()
    
    // Wait for error message
    await expect(page.getByText(/接続に失敗しました/)).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-connection-error.png' })
  })

  test('should test connection status endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/gitlab/status')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('connected')
  })

  test('should navigate between dashboard and pbl viewer', async ({ page }) => {
    // Test navigation
    await page.getByRole('link', { name: 'PBL Viewer' }).click()
    await expect(page.getByText('PBL Viewer')).toBeVisible()
    
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByText('Dashboard')).toBeVisible()
    
    await page.screenshot({ path: 'test-results/phase1-navigation.png' })
  })

  test('should display API documentation', async ({ page }) => {
    await page.goto('http://localhost:8000/docs')
    await expect(page.getByText('GitLab Bud Chart API')).toBeVisible()
    await page.screenshot({ path: 'test-results/phase1-api-docs.png' })
  })
})

test.describe('Phase 1: API Integration Tests', () => {
  test('backend health check', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/health')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })

  test('issues API basic response', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/issues')
    expect(response.status()).toBe(200)
    
    const issues = await response.json()
    expect(Array.isArray(issues)).toBe(true)
  })

  test('charts API basic response', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/charts/burn-down?milestone=v1.0&start_date=2024-01-01&end_date=2024-12-31')
    expect(response.status()).toBe(200)
    
    const chartData = await response.json()
    expect(Array.isArray(chartData)).toBe(true)
  })

  test('gitlab status API', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/gitlab/status')
    expect(response.status()).toBe(200)
    
    const status = await response.json()
    expect(status).toHaveProperty('connected')
  })
})
```

#### 3.2 E2Eテスト実行スクリプト更新

**scripts/run-phase1-e2e.sh**:
```bash
#!/bin/bash
set -e

echo "=== Phase 1 E2E テスト実行 ==="

# Backend起動
echo "Backend起動中..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Frontend起動
echo "Frontend起動中..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# サーバー起動待機
echo "サーバー起動待機中..."
sleep 15

# Health check
echo "Health check実行中..."
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:5173 || exit 1

# Phase 1 E2Eテスト実行
echo "Phase 1 E2Eテスト実行中..."
npx playwright test tests/e2e/phase1-gitlab-connection.spec.ts

echo "Phase 1 テスト完了！"

# プロセス終了
echo "サーバー停止中..."
kill $BACKEND_PID $FRONTEND_PID

echo "Phase 1 完了: GitLab接続設定・基本テスト成功"
```

### 4. 環境設定ファイル

#### 4.1 Backend環境設定

**backend/.env.example**:
```
# GitLab Configuration
GITLAB_URL=http://localhost:8080
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_PROJECT_ID=1

# API Configuration
API_HOST=127.0.0.1
API_PORT=8000
```

#### 4.2 CSS追加

**frontend/src/App.css** 追加:
```css
.gitlab-config {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.config-form .form-group {
  margin-bottom: 15px;
}

.config-form label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.config-form input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.status {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
}

.status.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.nav-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 20px;
}

.nav-tab {
  padding: 10px 20px;
  text-decoration: none;
  color: #666;
  border-bottom: 2px solid transparent;
}

.nav-tab:hover {
  background-color: #f5f5f5;
}

.issues-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.issues-table th,
.issues-table td {
  padding: 8px;
  text-align: left;
  border: 1px solid #ddd;
}

.issues-table th {
  background-color: #f5f5f5;
}
```

## 成果物

### 必須成果物
1. **GitLab接続機能**:
   - GitLabClient実装
   - 接続・認証機能
   - 接続状態確認機能

2. **GitLab設定API**:
   - 接続API (/api/gitlab/connect)
   - 状態確認API (/api/gitlab/status)
   - サンプルissue取得API

3. **Frontend GitLab設定UI**:
   - GitLabConfig コンポーネント
   - Dashboard統合
   - エラーハンドリング

4. **Phase 1 E2Eテスト**:
   - GitLab接続設定テスト
   - API統合テスト
   - ナビゲーションテスト
   - 全自動実行スクリプト

5. **検証用スクリーンショット**:
   - phase1-gitlab-config-form.png
   - phase1-form-validation.png
   - phase1-connection-error.png
   - phase1-navigation.png
   - phase1-api-docs.png

## 検証項目

### 実施前確認
- [ ] Task 02の開発環境動作確認
- [ ] GitLab環境・Token準備完了
- [ ] Backend/Frontend サーバー起動確認

### 実施後確認
- [ ] GitLab API接続成功
- [ ] 認証機能正常動作
- [ ] GitLab設定UI正常動作
- [ ] APIエンドポイント全件動作確認
- [ ] Phase 1 E2Eテスト全件成功

### Phase 1完了条件
- [ ] GitLab接続設定・確認機能完成
- [ ] サンプルissue取得確認
- [ ] Frontend/Backend統合動作確認
- [ ] E2Eテスト全件実行・スクリーンショット取得成功
- [ ] エラーハンドリング適切に実装

## 次のタスクへの引き継ぎ

### Phase 2 (Task 04)への引き継ぎ事項
- GitLab接続機能完成版
- GitLabClient基盤クラス
- 認証済み状態でのAPI呼び出し基盤

### 注意事項
- GitLab Token管理（機密情報）
- 接続エラー時の適切なメッセージ表示
- E2Eテスト実行前の環境確認必須

## 作業時間見積もり
- **GitLab接続実装**: 3-4時間
- **Frontend設定UI**: 2-3時間
- **テスト実装**: 2-3時間
- **E2Eテスト・検証**: 2-3時間
- **合計**: 9-13時間

## Phase 1完了
このタスク完了により **Phase 1: GitLab接続設定** が完了し、Phase 2: GitLab issue取得 に進むことができます。
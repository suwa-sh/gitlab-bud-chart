# Task 02: 開発環境構築

## 概要
FastAPI + React + TypeScript + Playwright の開発環境を構築し、基本的な動作確認を行う。

## 目的
- Backend基盤（FastAPI + Uvicorn）構築
- Frontend基盤（React + TypeScript + Vite）構築
- Playwright E2E テスト環境構築
- 開発サーバー起動・HTTP通信確認

## 前提条件
- Task 01完了（ADR作成・プロジェクト構造確定）
- Python 3.8+ インストール済み
- Node.js 18+ インストール済み

## 作業手順

### 1. Backend環境構築（FastAPI）

#### 1.1 Python仮想環境・依存関係管理
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install fastapi uvicorn python-multipart python-gitlab pydantic python-dotenv pytest httpx
pip freeze > requirements.txt
```

#### 1.2 pyproject.toml作成
```toml
[project]
name = "gitlab-bud-chart-backend"
version = "0.1.0"
description = "GitLab Issue Analysis Backend API"
authors = [
    {name = "Development Team", email = "dev@example.com"}
]
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "python-gitlab>=4.0.0",
    "pydantic>=2.0.0",
    "python-dotenv>=1.0.0",
    "python-multipart>=0.0.6"
]
requires-python = ">= 3.8"

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "httpx>=0.25.0",
    "pytest-asyncio>=0.21.0"
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

#### 1.3 基本FastAPIアプリケーション作成

**app/main.py**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import issues, charts
from app.config import settings

app = FastAPI(
    title="GitLab Bud Chart API",
    description="GitLab Issue Analysis and Chart Generation API",
    version="0.1.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター追加
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])

@app.get("/")
async def root():
    return {"message": "GitLab Bud Chart API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

**app/config.py**:
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # GitLab設定
    gitlab_url: Optional[str] = None
    gitlab_token: Optional[str] = None
    gitlab_project_id: Optional[str] = None
    
    # API設定
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**app/api/issues.py**:
```python
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.issue import IssueResponse

router = APIRouter()

@router.get("/", response_model=List[IssueResponse])
async def get_issues(
    milestone: Optional[str] = None,
    assignee: Optional[str] = None,
    state: Optional[str] = None
):
    """GitLabからissue一覧を取得"""
    # TODO: Task 04で実装
    return [
        {
            "id": 1,
            "title": "Sample Issue",
            "state": "opened",
            "created_at": "2024-01-01T00:00:00Z",
            "assignee": "user1",
            "milestone": "v1.0",
            "labels": ["p:1.0", "#作業中", "s:backend"],
            "point": 1.0,
            "kanban_status": "作業中",
            "service": "backend"
        }
    ]

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: int):
    """特定issue詳細取得"""
    # TODO: Task 04で実装
    return {
        "id": issue_id,
        "title": f"Issue {issue_id}",
        "state": "opened",
        "created_at": "2024-01-01T00:00:00Z",
        "assignee": "user1",
        "milestone": "v1.0",
        "labels": ["p:1.0"],
        "point": 1.0
    }
```

**app/api/charts.py**:
```python
from fastapi import APIRouter
from typing import List
from app.models.chart import ChartDataResponse

router = APIRouter()

@router.get("/burn-down", response_model=List[ChartDataResponse])
async def get_burn_down_data(
    milestone: str,
    start_date: str,
    end_date: str
):
    """Burn-downチャートデータ取得"""
    # TODO: Task 10で実装
    return [
        {
            "date": "2024-01-01",
            "planned_points": 10.0,
            "actual_points": 0.0,
            "remaining_points": 10.0
        }
    ]

@router.get("/burn-up", response_model=List[ChartDataResponse])
async def get_burn_up_data(
    milestone: str,
    start_date: str,
    end_date: str
):
    """Burn-upチャートデータ取得"""
    # TODO: Task 10で実装
    return [
        {
            "date": "2024-01-01",
            "planned_points": 10.0,
            "actual_points": 0.0,
            "completed_points": 0.0
        }
    ]
```

#### 1.4 データモデル作成

**app/models/issue.py**:
```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IssueResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    state: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    
    # 分析済みフィールド
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None
```

**app/models/chart.py**:
```python
from pydantic import BaseModel
from datetime import date

class ChartDataResponse(BaseModel):
    date: date
    planned_points: float = 0.0
    actual_points: float = 0.0
    remaining_points: float = 0.0
    completed_points: float = 0.0
    completed_issues: int = 0
    total_issues: int = 0
```

#### 1.5 基本テスト作成

**tests/test_main.py**:
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "GitLab Bud Chart API"

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

### 2. Frontend環境構築（React + TypeScript）

#### 2.1 Vite + React + TypeScript プロジェクト作成
```bash
cd frontend
npm create vite@latest . -- --template react-ts

# 依存関係追加
npm install react-router-dom axios recharts
npm install -D @types/node @playwright/test
```

#### 2.2 package.json設定
```json
{
  "name": "gitlab-bud-chart-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.18.0",
    "axios": "^1.6.0",
    "recharts": "^2.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.1.0",
    "typescript": "^5.2.2",
    "vite": "^4.5.0",
    "vitest": "^0.34.6",
    "@playwright/test": "^1.40.0"
  }
}
```

#### 2.3 基本React アプリケーション作成

**src/App.tsx**:
```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard/Dashboard'
import { PBLViewer } from './components/PBLViewer/PBLViewer'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="nav-tabs">
          <a href="/dashboard" className="nav-tab">Dashboard</a>
          <a href="/pbl-viewer" className="nav-tab">PBL Viewer</a>
        </nav>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pbl-viewer" element={<PBLViewer />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
```

**src/components/Dashboard/Dashboard.tsx**:
```tsx
export const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="config-section">
        <p>GitLab Config: http://localhost:8080/project/team</p>
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
        <h2>Issues</h2>
        <table className="issues-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Title</th>
              <th>Point</th>
              <th>Kanban Status</th>
              <th>Assignee</th>
              <th>Created At</th>
              <th>Completed At</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>v1.0</td>
              <td>Issue1</td>
              <td>1.0</td>
              <td>作業中</td>
              <td>user1</td>
              <td>2024-01-01</td>
              <td>-</td>
              <td>Open</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**src/components/PBLViewer/PBLViewer.tsx**:
```tsx
export const PBLViewer = () => {
  return (
    <div className="pbl-viewer">
      <h1>PBL Viewer</h1>
      <div className="issues-section">
        <table className="issues-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Title</th>
              <th>Point</th>
              <th>Kanban Status</th>
              <th>Assignee</th>
              <th>Created At</th>
              <th>Completed At</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>v1.0</td>
              <td>Issue1</td>
              <td>1.0</td>
              <td>作業中</td>
              <td>user1</td>
              <td>2024-01-01</td>
              <td>-</td>
              <td>Open</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

#### 2.4 型定義作成

**src/types/api.ts**:
```typescript
export interface Issue {
  id: number
  title: string
  description?: string
  state: string
  created_at: string
  updated_at?: string
  due_date?: string
  assignee?: string
  milestone?: string
  labels: string[]
  
  // 分析済みフィールド
  point?: number
  kanban_status?: string
  service?: string
  quarter?: string
  completed_at?: string
}

export interface ChartData {
  date: string
  planned_points: number
  actual_points: number
  remaining_points: number
  completed_points: number
  completed_issues: number
  total_issues: number
}
```

**src/services/api.ts**:
```typescript
import axios from 'axios'
import { Issue, ChartData } from '../types/api'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const issuesApi = {
  getIssues: async (params?: {
    milestone?: string
    assignee?: string
    state?: string
  }): Promise<Issue[]> => {
    const response = await api.get('/issues', { params })
    return response.data
  },
  
  getIssue: async (id: number): Promise<Issue> => {
    const response = await api.get(`/issues/${id}`)
    return response.data
  },
}

export const chartsApi = {
  getBurnDownData: async (
    milestone: string,
    startDate: string,
    endDate: string
  ): Promise<ChartData[]> => {
    const response = await api.get('/charts/burn-down', {
      params: { milestone, start_date: startDate, end_date: endDate }
    })
    return response.data
  },
  
  getBurnUpData: async (
    milestone: string,
    startDate: string,
    endDate: string
  ): Promise<ChartData[]> => {
    const response = await api.get('/charts/burn-up', {
      params: { milestone, start_date: startDate, end_date: endDate }
    })
    return response.data
  },
}
```

### 3. Playwright E2E テスト環境構築

#### 3.1 Playwright設定

**playwright.config.ts**:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd backend && source venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
```

#### 3.2 基本E2Eテスト作成

**tests/e2e/basic.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Basic App Functionality', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/)
    await page.screenshot({ path: 'test-results/homepage.png' })
  })

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard')).toBeVisible()
    await page.screenshot({ path: 'test-results/dashboard.png' })
  })

  test('should navigate to pbl viewer', async ({ page }) => {
    await page.goto('/pbl-viewer')
    await expect(page.getByText('PBL Viewer')).toBeVisible()
    await page.screenshot({ path: 'test-results/pbl-viewer.png' })
  })
})

test.describe('API Integration', () => {
  test('should connect to backend API', async ({ page }) => {
    // Backend health check
    const response = await page.request.get('http://localhost:8000/health')
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })

  test('should get issues from API', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/issues')
    expect(response.status()).toBe(200)
    const issues = await response.json()
    expect(Array.isArray(issues)).toBe(true)
  })
})
```

### 4. 動作確認スクリプト作成

#### 4.1 setup.sh
```bash
#!/bin/bash
set -e

echo "=== GitLab Bud Chart 開発環境セットアップ ==="

# Backend setup
echo "Backend環境構築中..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
echo "Frontend環境構築中..."
cd ../frontend
npm install

# Playwright setup
echo "Playwright環境構築中..."
npx playwright install

echo "セットアップ完了！"
echo "Backend起動: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "Frontend起動: cd frontend && npm run dev"
echo "E2Eテスト実行: cd frontend && npm run test:e2e"
```

#### 4.2 run-e2e.sh
```bash
#!/bin/bash
set -e

echo "=== E2E テスト実行 ==="

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
sleep 10

# E2Eテスト実行
echo "E2Eテスト実行中..."
npm run test:e2e

# プロセス終了
echo "テスト完了。サーバー停止中..."
kill $BACKEND_PID $FRONTEND_PID
```

## 成果物

### 必須成果物
1. **Backend環境**:
   - FastAPI アプリケーション動作確認
   - API エンドポイント（/health, /api/issues, /api/charts）
   - 基本テスト実行成功

2. **Frontend環境**:
   - React + TypeScript アプリケーション動作確認
   - Dashboard/PBL Viewer画面表示
   - APIクライアント実装

3. **E2E テスト環境**:
   - Playwright設定・実行成功
   - 基本E2Eテスト実行・スクリーンショット取得

4. **環境構築スクリプト**:
   - setup.sh, run-e2e.sh

### 確認用スクリーンショット
- homepage.png
- dashboard.png
- pbl-viewer.png

## 検証項目

### 実施前確認
- [ ] Task 01のADR確認完了
- [ ] 技術スタック決定事項確認
- [ ] 開発環境（Python, Node.js）準備完了

### 実施後確認
- [ ] Backend サーバー正常起動（http://localhost:8000）
- [ ] Frontend サーバー正常起動（http://localhost:5173）
- [ ] API通信確認（/health, /api/issues）
- [ ] 画面遷移確認（Dashboard ⇔ PBL Viewer）
- [ ] Playwright E2Eテスト全件実行成功
- [ ] スクリーンショット取得成功

### 品質確認
- [ ] Backend APIドキュメント確認（http://localhost:8000/docs）
- [ ] TypeScript型安全性確認
- [ ] CORS設定確認
- [ ] エラーハンドリング基本動作確認

## 次のタスクへの引き継ぎ

### Task 03への引き継ぎ事項
- 動作確認済み開発環境
- API基盤構造
- E2Eテスト実行環境

### 注意事項
- 開発サーバーポート（Backend: 8000, Frontend: 5173）
- CORS設定に注意
- E2Eテスト実行前に両サーバー起動必須

## 作業時間見積もり
- **Backend環境構築**: 2-3時間
- **Frontend環境構築**: 2-3時間
- **Playwright設定**: 1-2時間
- **動作確認・E2Eテスト**: 1-2時間
- **合計**: 6-10時間
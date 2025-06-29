# Task 04: GitLab API統合・issue取得ロジック

## 概要
GitLab APIからissue取得機能を実装し、エラーハンドリング・ページネーション対応を行う。

## 目的
- Issue取得API実装
- エラーハンドリング・リトライ機能
- ページネーション対応
- 単体テスト実装

## 前提条件
- Task 03完了（GitLab接続設定済み）
- GitLab API動作確認済み

## 作業手順

### 1. Issue取得サービス実装

#### 1.1 IssueService基盤クラス作成
**backend/app/services/issue_service.py**:
```python
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from app.services.gitlab_client import gitlab_client
from app.models.issue import IssueModel, IssueResponse

logger = logging.getLogger(__name__)

class IssueService:
    def __init__(self):
        self.client = gitlab_client
    
    async def get_all_issues(
        self,
        state: Optional[str] = 'all',
        milestone: Optional[str] = None,
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        per_page: int = 100
    ) -> List[IssueModel]:
        """全issue取得（ページネーション対応）"""
        if not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            all_issues = []
            page = 1
            
            while True:
                logger.info(f"Issues取得中... page: {page}")
                
                # パラメータ構築
                params = {
                    'state': state,
                    'per_page': per_page,
                    'page': page,
                    'order_by': 'created_at',
                    'sort': 'desc'
                }
                
                if milestone:
                    params['milestone'] = milestone
                if assignee:
                    params['assignee_username'] = assignee
                if labels:
                    params['labels'] = ','.join(labels)
                
                # API呼び出し
                issues_page = self.client.project.issues.list(**params)
                
                if not issues_page:
                    break
                
                # IssueModel変換
                for issue in issues_page:
                    issue_model = self._convert_to_model(issue)
                    all_issues.append(issue_model)
                
                # ページネーション制御
                if len(issues_page) < per_page:
                    break
                
                page += 1
                
                # 安全装置（最大1000件）
                if len(all_issues) >= 1000:
                    logger.warning("Issue取得数が1000件に達したため停止")
                    break
            
            logger.info(f"Issues取得完了: {len(all_issues)}件")
            return all_issues
            
        except Exception as e:
            logger.error(f"Issues取得失敗: {e}")
            raise
    
    async def get_issue_by_id(self, issue_id: int) -> Optional[IssueModel]:
        """特定issue取得"""
        if not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            issue = self.client.project.issues.get(issue_id)
            return self._convert_to_model(issue)
        except Exception as e:
            logger.error(f"Issue取得失敗 (ID: {issue_id}): {e}")
            return None
    
    async def get_issues_by_milestone(
        self,
        milestone: str,
        state: str = 'all'
    ) -> List[IssueModel]:
        """マイルストーン別issue取得"""
        return await self.get_all_issues(
            state=state,
            milestone=milestone
        )
    
    def _convert_to_model(self, gitlab_issue) -> IssueModel:
        """GitLab Issue → IssueModel 変換"""
        try:
            return IssueModel(
                id=gitlab_issue.id,
                title=gitlab_issue.title,
                description=gitlab_issue.description or "",
                state=gitlab_issue.state,
                created_at=self._parse_datetime(gitlab_issue.created_at),
                updated_at=self._parse_datetime(gitlab_issue.updated_at),
                due_date=self._parse_datetime(gitlab_issue.due_date) if gitlab_issue.due_date else None,
                assignee=gitlab_issue.assignee['name'] if gitlab_issue.assignee else None,
                milestone=gitlab_issue.milestone['title'] if gitlab_issue.milestone else None,
                labels=gitlab_issue.labels or [],
                web_url=gitlab_issue.web_url
            )
        except Exception as e:
            logger.error(f"Issue変換失敗: {e}")
            raise
    
    def _parse_datetime(self, date_str: Optional[str]) -> Optional[datetime]:
        """日時文字列解析"""
        if not date_str:
            return None
        
        try:
            # GitLabの日時形式: "2024-01-01T00:00:00.000Z"
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.warning(f"日時解析失敗: {date_str}, error: {e}")
            return None

# グローバルインスタンス
issue_service = IssueService()
```

#### 1.2 データモデル拡張

**backend/app/models/issue.py** 更新:
```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IssueModel(BaseModel):
    id: int
    title: str
    description: str
    state: str  # opened, closed
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    web_url: Optional[str] = None
    
    # 分析用フィールド（Task 05で実装）
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None

class IssueResponse(BaseModel):
    """API レスポンス用"""
    id: int
    title: str
    description: str
    state: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    web_url: Optional[str] = None
    
    # 分析済みフィールド
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None

class IssueListRequest(BaseModel):
    """Issue一覧取得リクエスト"""
    state: Optional[str] = 'all'
    milestone: Optional[str] = None
    assignee: Optional[str] = None
    labels: Optional[List[str]] = None
    per_page: Optional[int] = 100

class IssueListResponse(BaseModel):
    """Issue一覧取得レスポンス"""
    total_count: int
    issues: List[IssueResponse]
    milestones: List[str]
    assignees: List[str]
```

#### 1.3 Issues API実装更新

**backend/app/api/issues.py** 更新:
```python
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.issue_service import issue_service
from app.models.issue import (
    IssueResponse, 
    IssueListRequest, 
    IssueListResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=IssueListResponse)
async def get_issues(
    state: Optional[str] = Query('all', description="Issue状態 (all, opened, closed)"),
    milestone: Optional[str] = Query(None, description="マイルストーン名"),
    assignee: Optional[str] = Query(None, description="担当者名"),
    labels: Optional[str] = Query(None, description="ラベル (カンマ区切り)")
):
    """GitLabからissue一覧を取得"""
    try:
        # ラベル解析
        label_list = labels.split(',') if labels else None
        
        # Issue取得
        issues = await issue_service.get_all_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=label_list
        )
        
        # メタデータ抽出
        milestones = list(set(issue.milestone for issue in issues if issue.milestone))
        assignees = list(set(issue.assignee for issue in issues if issue.assignee))
        
        # レスポンス変換
        issue_responses = [
            IssueResponse(
                id=issue.id,
                title=issue.title,
                description=issue.description,
                state=issue.state,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                due_date=issue.due_date,
                assignee=issue.assignee,
                milestone=issue.milestone,
                labels=issue.labels,
                web_url=issue.web_url,
                point=issue.point,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter,
                completed_at=issue.completed_at
            )
            for issue in issues
        ]
        
        return IssueListResponse(
            total_count=len(issue_responses),
            issues=issue_responses,
            milestones=sorted(milestones),
            assignees=sorted(assignees)
        )
        
    except Exception as e:
        logger.error(f"Issues取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issues取得に失敗しました: {str(e)}")

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: int):
    """特定issue詳細取得"""
    try:
        issue = await issue_service.get_issue_by_id(issue_id)
        
        if not issue:
            raise HTTPException(status_code=404, detail=f"Issue not found: {issue_id}")
        
        return IssueResponse(
            id=issue.id,
            title=issue.title,
            description=issue.description,
            state=issue.state,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            due_date=issue.due_date,
            assignee=issue.assignee,
            milestone=issue.milestone,
            labels=issue.labels,
            web_url=issue.web_url,
            point=issue.point,
            kanban_status=issue.kanban_status,
            service=issue.service,
            quarter=issue.quarter,
            completed_at=issue.completed_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Issue詳細取得API失敗 (ID: {issue_id}): {e}")
        raise HTTPException(status_code=500, detail=f"Issue詳細取得に失敗しました: {str(e)}")

@router.get("/milestone/{milestone_name}", response_model=IssueListResponse)
async def get_issues_by_milestone(milestone_name: str):
    """マイルストーン別issue取得"""
    try:
        issues = await issue_service.get_issues_by_milestone(milestone_name)
        
        issue_responses = [
            IssueResponse(
                id=issue.id,
                title=issue.title,
                description=issue.description,
                state=issue.state,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                due_date=issue.due_date,
                assignee=issue.assignee,
                milestone=issue.milestone,
                labels=issue.labels,
                web_url=issue.web_url,
                point=issue.point,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter,
                completed_at=issue.completed_at
            )
            for issue in issues
        ]
        
        return IssueListResponse(
            total_count=len(issue_responses),
            issues=issue_responses,
            milestones=[milestone_name],
            assignees=list(set(issue.assignee for issue in issues if issue.assignee))
        )
        
    except Exception as e:
        logger.error(f"マイルストーン別Issues取得API失敗 ({milestone_name}): {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"マイルストーン別Issues取得に失敗しました: {str(e)}"
        )
```

### 2. エラーハンドリング・リトライ機能

#### 2.1 リトライデコレータ実装

**backend/app/utils/retry.py**:
```python
import functools
import time
import logging
from typing import Callable, Any, Type, Tuple

logger = logging.getLogger(__name__)

def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """リトライデコレータ"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        logger.error(f"{func.__name__} 最大リトライ回数に達しました: {e}")
                        raise e
                    
                    wait_time = delay * (backoff ** attempt)
                    logger.warning(
                        f"{func.__name__} リトライ {attempt + 1}/{max_attempts}, "
                        f"待機時間: {wait_time:.1f}秒, エラー: {e}"
                    )
                    time.sleep(wait_time)
            
            raise last_exception
        
        return wrapper
    return decorator

def async_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """非同期リトライデコレータ"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            import asyncio
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        logger.error(f"{func.__name__} 最大リトライ回数に達しました: {e}")
                        raise e
                    
                    wait_time = delay * (backoff ** attempt)
                    logger.warning(
                        f"{func.__name__} リトライ {attempt + 1}/{max_attempts}, "
                        f"待機時間: {wait_time:.1f}秒, エラー: {e}"
                    )
                    await asyncio.sleep(wait_time)
            
            raise last_exception
        
        return wrapper
    return decorator
```

#### 2.2 IssueServiceにリトライ適用

**backend/app/services/issue_service.py** にリトライ追加:
```python
from app.utils.retry import async_retry

class IssueService:
    # ... 既存コード ...
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_all_issues(self, ...):
        # 既存の実装...
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_issue_by_id(self, issue_id: int):
        # 既存の実装...
```

### 3. 単体テスト実装

#### 3.1 IssueService テスト

**backend/tests/test_issue_service.py**:
```python
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from app.services.issue_service import IssueService
from app.models.issue import IssueModel

class TestIssueService:
    @pytest.fixture
    def mock_gitlab_client(self):
        client = Mock()
        client.gl = Mock()
        client.project = Mock()
        return client
    
    @pytest.fixture
    def issue_service(self, mock_gitlab_client):
        service = IssueService()
        service.client = mock_gitlab_client
        return service
    
    @pytest.fixture
    def mock_gitlab_issue(self):
        issue = Mock()
        issue.id = 1
        issue.title = "Test Issue"
        issue.description = "Test Description"
        issue.state = "opened"
        issue.created_at = "2024-01-01T00:00:00.000Z"
        issue.updated_at = "2024-01-01T12:00:00.000Z"
        issue.due_date = None
        issue.assignee = {'name': 'testuser'}
        issue.milestone = {'title': 'v1.0'}
        issue.labels = ['p:1.0', '#作業中']
        issue.web_url = "http://example.com/issues/1"
        return issue
    
    @pytest.mark.asyncio
    async def test_get_all_issues_success(self, issue_service, mock_gitlab_issue):
        # Mock設定
        issue_service.client.project.issues.list.return_value = [mock_gitlab_issue]
        
        # 実行
        result = await issue_service.get_all_issues()
        
        # 検証
        assert len(result) == 1
        assert result[0].id == 1
        assert result[0].title == "Test Issue"
        assert result[0].assignee == "testuser"
        assert result[0].milestone == "v1.0"
    
    @pytest.mark.asyncio
    async def test_get_all_issues_pagination(self, issue_service, mock_gitlab_issue):
        # Mock設定（ページネーション）
        page1_issues = [mock_gitlab_issue] * 100
        page2_issues = [mock_gitlab_issue] * 50
        
        def mock_list(**params):
            if params.get('page') == 1:
                return page1_issues
            elif params.get('page') == 2:
                return page2_issues
            else:
                return []
        
        issue_service.client.project.issues.list.side_effect = mock_list
        
        # 実行
        result = await issue_service.get_all_issues(per_page=100)
        
        # 検証
        assert len(result) == 150
        assert issue_service.client.project.issues.list.call_count == 2
    
    @pytest.mark.asyncio
    async def test_get_all_issues_no_connection(self, issue_service):
        # Mock設定（未接続）
        issue_service.client.gl = None
        
        # 実行・検証
        with pytest.raises(ValueError, match="GitLab接続が設定されていません"):
            await issue_service.get_all_issues()
    
    @pytest.mark.asyncio
    async def test_get_issue_by_id_success(self, issue_service, mock_gitlab_issue):
        # Mock設定
        issue_service.client.project.issues.get.return_value = mock_gitlab_issue
        
        # 実行
        result = await issue_service.get_issue_by_id(1)
        
        # 検証
        assert result is not None
        assert result.id == 1
        assert result.title == "Test Issue"
    
    @pytest.mark.asyncio
    async def test_get_issue_by_id_not_found(self, issue_service):
        # Mock設定（404エラー）
        issue_service.client.project.issues.get.side_effect = Exception("404 Not Found")
        
        # 実行
        result = await issue_service.get_issue_by_id(999)
        
        # 検証
        assert result is None
    
    def test_convert_to_model(self, issue_service, mock_gitlab_issue):
        # 実行
        result = issue_service._convert_to_model(mock_gitlab_issue)
        
        # 検証
        assert isinstance(result, IssueModel)
        assert result.id == 1
        assert result.title == "Test Issue"
        assert result.assignee == "testuser"
        assert result.milestone == "v1.0"
        assert result.labels == ['p:1.0', '#作業中']
    
    def test_parse_datetime_valid(self, issue_service):
        # 実行
        result = issue_service._parse_datetime("2024-01-01T00:00:00.000Z")
        
        # 検証
        assert result is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1
    
    def test_parse_datetime_invalid(self, issue_service):
        # 実行
        result = issue_service._parse_datetime("invalid-date")
        
        # 検証
        assert result is None
    
    def test_parse_datetime_none(self, issue_service):
        # 実行
        result = issue_service._parse_datetime(None)
        
        # 検証
        assert result is None
```

#### 3.2 Issues API テスト

**backend/tests/test_api_issues.py**:
```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.models.issue import IssueModel
from datetime import datetime

@pytest.mark.asyncio
class TestIssuesAPI:
    
    @patch('app.api.issues.issue_service')
    async def test_get_issues_success(self, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1,
                title="Test Issue 1",
                description="Description 1",
                state="opened",
                created_at=datetime(2024, 1, 1),
                assignee="user1",
                milestone="v1.0",
                labels=["p:1.0", "#作業中"]
            ),
            IssueModel(
                id=2,
                title="Test Issue 2",
                description="Description 2",
                state="closed",
                created_at=datetime(2024, 1, 2),
                assignee="user2",
                milestone="v1.0",
                labels=["p:2.0", "#完了"]
            )
        ]
        mock_service.get_all_issues = AsyncMock(return_value=mock_issues)
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert len(data["issues"]) == 2
        assert data["issues"][0]["title"] == "Test Issue 1"
        assert "v1.0" in data["milestones"]
        assert "user1" in data["assignees"]
        assert "user2" in data["assignees"]
    
    @patch('app.api.issues.issue_service')
    async def test_get_issues_with_filters(self, mock_service):
        # Mock設定
        mock_service.get_all_issues = AsyncMock(return_value=[])
        
        # API呼び出し（フィルタ付き）
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get(
                "/api/issues",
                params={
                    "state": "opened",
                    "milestone": "v1.0",
                    "assignee": "user1",
                    "labels": "p:1.0,#作業中"
                }
            )
        
        # 検証
        assert response.status_code == 200
        
        # モック呼び出し確認
        mock_service.get_all_issues.assert_called_once_with(
            state="opened",
            milestone="v1.0",
            assignee="user1",
            labels=["p:1.0", "#作業中"]
        )
    
    @patch('app.api.issues.issue_service')
    async def test_get_issues_error(self, mock_service):
        # Mock設定（エラー）
        mock_service.get_all_issues = AsyncMock(side_effect=Exception("API Error"))
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues")
        
        # 検証
        assert response.status_code == 500
        assert "Issues取得に失敗しました" in response.json()["detail"]
    
    @patch('app.api.issues.issue_service')
    async def test_get_issue_by_id_success(self, mock_service):
        # Mock設定
        mock_issue = IssueModel(
            id=1,
            title="Test Issue",
            description="Description",
            state="opened",
            created_at=datetime(2024, 1, 1),
            labels=[]
        )
        mock_service.get_issue_by_id = AsyncMock(return_value=mock_issue)
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues/1")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Test Issue"
    
    @patch('app.api.issues.issue_service')
    async def test_get_issue_by_id_not_found(self, mock_service):
        # Mock設定（未発見）
        mock_service.get_issue_by_id = AsyncMock(return_value=None)
        
        # API呼び出し
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/api/issues/999")
        
        # 検証
        assert response.status_code == 404
        assert "Issue not found" in response.json()["detail"]
```

### 4. 統合テスト・パフォーマンステスト

#### 4.1 統合テスト

**backend/tests/integration/test_gitlab_integration.py**:
```python
import pytest
from app.services.gitlab_client import gitlab_client
from app.services.issue_service import issue_service
import os

@pytest.mark.integration
@pytest.mark.skipif(
    not all([
        os.getenv('TEST_GITLAB_URL'),
        os.getenv('TEST_GITLAB_TOKEN'),
        os.getenv('TEST_GITLAB_PROJECT_ID')
    ]),
    reason="GitLab統合テスト環境変数が設定されていません"
)
class TestGitLabIntegration:
    
    @pytest.fixture(scope="class")
    def setup_gitlab_connection(self):
        # テスト用GitLab接続
        success = gitlab_client.connect(
            os.getenv('TEST_GITLAB_URL'),
            os.getenv('TEST_GITLAB_TOKEN'),
            os.getenv('TEST_GITLAB_PROJECT_ID')
        )
        assert success, "GitLab接続に失敗しました"
        yield
        # クリーンアップ
        gitlab_client.gl = None
        gitlab_client.project = None
    
    @pytest.mark.asyncio
    async def test_real_issues_retrieval(self, setup_gitlab_connection):
        # 実際のIssue取得テスト
        issues = await issue_service.get_all_issues(per_page=10)
        
        # 基本検証
        assert isinstance(issues, list)
        print(f"取得したIssues数: {len(issues)}")
        
        if issues:
            issue = issues[0]
            assert hasattr(issue, 'id')
            assert hasattr(issue, 'title')
            assert hasattr(issue, 'state')
            assert hasattr(issue, 'created_at')
            print(f"サンプルIssue: {issue.title} (ID: {issue.id})")
    
    @pytest.mark.asyncio
    async def test_milestone_filtering(self, setup_gitlab_connection):
        # 全Issue取得
        all_issues = await issue_service.get_all_issues(per_page=50)
        
        if not all_issues:
            pytest.skip("テスト対象のIssueが存在しません")
        
        # マイルストーン別取得
        milestones = list(set(issue.milestone for issue in all_issues if issue.milestone))
        
        if milestones:
            test_milestone = milestones[0]
            milestone_issues = await issue_service.get_issues_by_milestone(test_milestone)
            
            # 検証
            assert all(issue.milestone == test_milestone for issue in milestone_issues)
            print(f"マイルストーン '{test_milestone}' のIssue数: {len(milestone_issues)}")
    
    @pytest.mark.asyncio
    async def test_issue_detail_retrieval(self, setup_gitlab_connection):
        # Issue一覧取得
        issues = await issue_service.get_all_issues(per_page=5)
        
        if not issues:
            pytest.skip("テスト対象のIssueが存在しません")
        
        # 詳細取得テスト
        test_issue_id = issues[0].id
        detailed_issue = await issue_service.get_issue_by_id(test_issue_id)
        
        # 検証
        assert detailed_issue is not None
        assert detailed_issue.id == test_issue_id
        assert detailed_issue.title == issues[0].title
        print(f"詳細取得成功: {detailed_issue.title}")
```

#### 4.2 パフォーマンステスト

**backend/tests/performance/test_issue_performance.py**:
```python
import pytest
import time
import asyncio
from unittest.mock import Mock
from app.services.issue_service import IssueService

@pytest.mark.performance
class TestIssuePerformance:
    
    @pytest.fixture
    def mock_large_dataset(self):
        # 大量データのモック作成
        issues = []
        for i in range(1000):
            issue = Mock()
            issue.id = i
            issue.title = f"Issue {i}"
            issue.description = f"Description {i}"
            issue.state = "opened" if i % 2 == 0 else "closed"
            issue.created_at = "2024-01-01T00:00:00.000Z"
            issue.updated_at = "2024-01-01T12:00:00.000Z"
            issue.due_date = None
            issue.assignee = {'name': f'user{i % 10}'}
            issue.milestone = {'title': f'v{i // 100}.0'}
            issue.labels = [f'p:{(i % 5) + 1}.0', '#作業中']
            issue.web_url = f"http://example.com/issues/{i}"
            issues.append(issue)
        return issues
    
    @pytest.mark.asyncio
    async def test_large_dataset_processing(self, mock_large_dataset):
        # 大量データ処理性能テスト
        service = IssueService()
        
        # モック設定
        service.client = Mock()
        service.client.gl = Mock()
        service.client.project = Mock()
        
        # ページネーション模擬
        def mock_list(**params):
            page = params.get('page', 1)
            per_page = params.get('per_page', 100)
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            return mock_large_dataset[start_idx:end_idx]
        
        service.client.project.issues.list.side_effect = mock_list
        
        # 実行・計測
        start_time = time.time()
        issues = await service.get_all_issues(per_page=100)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # 検証
        assert len(issues) == 1000
        assert processing_time < 5.0  # 5秒以内
        print(f"1000件処理時間: {processing_time:.2f}秒")
        print(f"1件あたり処理時間: {(processing_time / 1000) * 1000:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        # 並行リクエスト性能テスト
        service = IssueService()
        
        # モック設定
        service.client = Mock()
        service.client.gl = Mock()
        service.client.project = Mock()
        
        mock_issue = Mock()
        mock_issue.id = 1
        mock_issue.title = "Test Issue"
        mock_issue.description = "Test"
        mock_issue.state = "opened"
        mock_issue.created_at = "2024-01-01T00:00:00.000Z"
        mock_issue.updated_at = "2024-01-01T12:00:00.000Z"
        mock_issue.due_date = None
        mock_issue.assignee = None
        mock_issue.milestone = None
        mock_issue.labels = []
        mock_issue.web_url = "http://example.com/issues/1"
        
        service.client.project.issues.get.return_value = mock_issue
        
        # 並行実行
        start_time = time.time()
        
        tasks = []
        for i in range(10):
            task = service.get_issue_by_id(i + 1)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # 検証
        assert len(results) == 10
        assert all(result is not None for result in results)
        assert processing_time < 2.0  # 2秒以内
        print(f"並行10件処理時間: {processing_time:.2f}秒")
```

## 成果物

### 必須成果物
1. **IssueService実装**:
   - 全issue取得機能（ページネーション対応）
   - 個別issue取得機能
   - マイルストーン別取得機能
   - エラーハンドリング・リトライ機能

2. **Issues API実装**:
   - GET /api/issues (フィルタ・検索対応)
   - GET /api/issues/{id}
   - GET /api/issues/milestone/{milestone}

3. **データモデル**:
   - IssueModel, IssueResponse
   - IssueListRequest, IssueListResponse

4. **テスト実装**:
   - 単体テスト（IssueService, Issues API）
   - 統合テスト（実GitLab接続）
   - パフォーマンステスト

5. **ユーティリティ**:
   - リトライ機能
   - エラーハンドリング

## 検証項目

### 実施前確認
- [ ] Task 03のGitLab接続機能動作確認
- [ ] GitLab API利用可能確認
- [ ] 開発環境正常動作確認

### 実施後確認
- [ ] 大量issue取得正常動作（100件以上）
- [ ] ページネーション正常動作
- [ ] エラー時の適切なリトライ実行
- [ ] 各種フィルタ（milestone, assignee, labels）正常動作
- [ ] 単体テスト全件成功
- [ ] パフォーマンス要件満足（1000件 < 5秒）

### 品質確認
- [ ] API レスポンス形式統一
- [ ] エラーメッセージ適切
- [ ] ログ出力適切
- [ ] メモリ使用量適正

## 次のタスクへの引き継ぎ

### Task 05への引き継ぎ事項
- Issue取得機能完成版
- IssueModel構造確定
- API基盤構築完了

### 注意事項
- 大量データ処理時のメモリ管理
- GitLab API Rate Limit対応
- エラー時の適切なユーザーフィードバック

## 作業時間見積もり
- **IssueService実装**: 4-5時間
- **API実装**: 2-3時間
- **テスト実装**: 3-4時間
- **パフォーマンス調整**: 1-2時間
- **合計**: 10-14時間
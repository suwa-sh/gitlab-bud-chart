import pytest
from httpx import AsyncClient, ASGITransport
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
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/")
        
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
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(
                "/api/issues/",
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
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/")
        
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
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
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
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/999")
        
        # 検証
        assert response.status_code == 404
        assert "Issue not found" in response.json()["detail"]
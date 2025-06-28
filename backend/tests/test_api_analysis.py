import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from datetime import datetime
from app.main import app
from app.models.issue import IssueModel

@pytest.mark.asyncio
class TestAnalysisAPI:
    
    @patch('app.api.issues.issue_service')
    async def test_get_analyzed_issues_success(self, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, kanban_status="作業中", service="backend"
            )
        ]
        mock_statistics = {
            'total_count': 1,
            'total_points': 1.0,
            'completion_rate': 0.0
        }
        mock_service.get_analyzed_issues = AsyncMock(return_value=(mock_issues, mock_statistics))
        
        # API呼び出し
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/analyzed")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert data['total_count'] == 1
        assert data['issues'][0]['point'] == 1.0
        assert data['issues'][0]['kanban_status'] == "作業中"
        assert 'statistics' in data
    
    @patch('app.api.issues.issue_service')
    @patch('app.api.issues.issue_analyzer')
    async def test_validate_issues_data(self, mock_analyzer, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[]
            )
        ]
        mock_service.get_all_issues = AsyncMock(return_value=mock_issues)
        mock_analyzer.analyze_issues_batch.return_value = mock_issues
        mock_analyzer.validate_issue_data.return_value = {
            'warnings': ['Test warning'],
            'errors': []
        }
        
        # API呼び出し
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/validation")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert 'validation_results' in data
        assert 'summary' in data
        assert data['summary']['total_issues'] == 1
    
    @patch('app.api.issues.issue_service')
    async def test_get_issues_statistics(self, mock_service):
        # Mock設定
        mock_issues = [
            IssueModel(
                id=1, title="Test Issue", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, milestone="v1.0", quarter="FY25Q1", service="backend"
            )
        ]
        mock_statistics = {
            'total_count': 1,
            'total_points': 1.0
        }
        mock_service.get_analyzed_issues = AsyncMock(return_value=(mock_issues, mock_statistics))
        
        # API呼び出し
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/issues/statistics")
        
        # 検証
        assert response.status_code == 200
        data = response.json()
        assert 'milestone_breakdown' in data
        assert 'quarter_breakdown' in data
        assert 'service_breakdown' in data
        assert 'point_distribution' in data
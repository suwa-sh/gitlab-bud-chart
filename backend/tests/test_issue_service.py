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
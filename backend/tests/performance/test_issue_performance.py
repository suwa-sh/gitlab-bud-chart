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
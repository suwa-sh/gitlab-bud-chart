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
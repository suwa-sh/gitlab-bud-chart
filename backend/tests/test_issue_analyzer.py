import pytest
from datetime import datetime
from app.services.issue_analyzer import IssueAnalyzer
from app.models.issue import IssueModel

class TestIssueAnalyzer:
    
    @pytest.fixture
    def analyzer(self):
        return IssueAnalyzer()
    
    @pytest.fixture
    def sample_issue(self):
        return IssueModel(
            id=1,
            title="Test Issue",
            description="Test Description",
            state="opened",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            due_date=datetime(2024, 2, 1),
            assignee="testuser",
            milestone="v1.0",
            labels=["p:1.5", "#作業中", "s:backend", "@FY25Q1", "enhancement"],
            web_url="http://example.com/issues/1"
        )
    
    def test_analyze_issue_all_labels(self, analyzer, sample_issue):
        # 実行
        result = analyzer.analyze_issue(sample_issue)
        
        # 検証
        assert result.point == 1.5
        assert result.kanban_status == "作業中"
        assert result.service == "backend"
        assert result.quarter == "FY25Q1"
        assert result.completed_at is None  # openedなので
    
    def test_analyze_labels_point_parsing(self, analyzer):
        # テストケース
        test_cases = [
            (["p:1.0"], 1.0),
            (["p:2.5"], 2.5),
            (["p:0.5"], 0.5),
            (["p:invalid"], None),
            (["point:1.0"], None),  # 無効なプレフィックス
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['point'] == expected, f"Labels: {labels}, Expected: {expected}, Got: {result['point']}"
    
    def test_analyze_labels_kanban_parsing(self, analyzer):
        test_cases = [
            (["#作業中"], "作業中"),
            (["#完了"], "完了"),
            (["#レビュー中"], "レビュー中"),
            (["#未着手"], "未着手"),
            (["作業中"], None),  # プレフィックスなし
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['kanban_status'] == expected
    
    def test_analyze_labels_service_parsing(self, analyzer):
        test_cases = [
            (["s:backend"], "backend"),
            (["s:frontend"], "frontend"),
            (["s:infrastructure"], "infrastructure"),
            (["service:backend"], None),  # 無効なプレフィックス
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['service'] == expected
    
    def test_analyze_labels_quarter_parsing(self, analyzer):
        test_cases = [
            (["@FY25Q1"], "FY25Q1"),
            (["@FY25Q4"], "FY25Q4"),
            (["FY25Q1"], None),  # プレフィックスなし
            ([], None)
        ]
        
        for labels, expected in test_cases:
            result = analyzer._analyze_labels(labels)
            assert result['quarter'] == expected
    
    def test_determine_completed_at_due_date_closed(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="closed",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            due_date=datetime(2024, 2, 1),
            labels=[]
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result == datetime(2024, 2, 1)
    
    def test_determine_completed_at_kanban_completed(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="opened",
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 15),
            labels=[],
            kanban_status="完了"
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result == datetime(2024, 1, 15)
    
    def test_determine_completed_at_none(self, analyzer):
        issue = IssueModel(
            id=1,
            title="Test",
            description="",
            state="opened",
            created_at=datetime(2024, 1, 1),
            labels=[],
            kanban_status="作業中"
        )
        
        result = analyzer._determine_completed_at(issue)
        assert result is None
    
    def test_analyze_issues_batch(self, analyzer):
        issues = [
            IssueModel(
                id=1, title="Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=["p:1.0", "#作業中"]
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="closed",
                created_at=datetime(2024, 1, 2), labels=["p:2.0", "#完了"]
            )
        ]
        
        results = analyzer.analyze_issues_batch(issues)
        
        assert len(results) == 2
        assert results[0].point == 1.0
        assert results[0].kanban_status == "作業中"
        assert results[1].point == 2.0
        assert results[1].kanban_status == "完了"
    
    def test_get_unique_values(self, analyzer):
        issues = [
            IssueModel(
                id=1, title="Issue 1", description="", state="opened",
                created_at=datetime(2024, 1, 1), labels=[],
                point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q1"
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="opened",
                created_at=datetime(2024, 1, 2), labels=[],
                point=2.0, kanban_status="完了", service="frontend", quarter="FY25Q1"
            ),
            IssueModel(
                id=3, title="Issue 3", description="", state="opened",
                created_at=datetime(2024, 1, 3), labels=[],
                point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q2"
            )
        ]
        
        result = analyzer.get_unique_values(issues)
        
        assert set(result['kanban_statuses']) == {"作業中", "完了"}
        assert set(result['services']) == {"backend", "frontend"}
        assert set(result['quarters']) == {"FY25Q1", "FY25Q2"}
        assert set(result['points']) == {1.0, 2.0}
    
    def test_validate_issue_data_valid(self, analyzer):
        issue = IssueModel(
            id=1, title="Test", description="", state="opened",
            created_at=datetime(2024, 1, 1), labels=[],
            point=1.0, kanban_status="作業中", service="backend", quarter="FY25Q1"
        )
        
        result = analyzer.validate_issue_data(issue)
        
        # 標準的な値なので警告のみ（非標準serviceかもしれないが）
        assert len(result['errors']) == 0
    
    def test_validate_issue_data_errors(self, analyzer):
        issue = IssueModel(
            id=1, title="Test", description="", state="opened",
            created_at=datetime(2024, 1, 1), labels=[],
            point=-1.0,  # 無効
            kanban_status="不明なステータス",
            service="unknown_service",
            quarter="invalid_quarter",
            completed_at=datetime(2024, 1, 15)  # openedなのに完了日設定
        )
        
        result = analyzer.validate_issue_data(issue)
        
        assert len(result['errors']) >= 1  # point値エラー
        assert len(result['warnings']) >= 4  # 各種警告
        assert any("Point値が不正" in error for error in result['errors'])
        assert any("Openedのissue" in warning for warning in result['warnings'])
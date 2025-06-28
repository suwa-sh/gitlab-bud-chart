import pytest
from datetime import date, datetime, timedelta
from app.services.chart_analyzer import ChartAnalyzer
from app.models.issue import IssueModel

class TestChartAnalyzer:
    
    @pytest.fixture
    def analyzer(self):
        return ChartAnalyzer()
    
    @pytest.fixture
    def sample_issues(self):
        base_date = datetime(2024, 1, 1)
        return [
            IssueModel(
                id=1, title="Issue 1", description="", state="closed",
                created_at=base_date, completed_at=base_date + timedelta(days=2),
                point=2.0, milestone="v1.0", labels=[]
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="closed",
                created_at=base_date, completed_at=base_date + timedelta(days=5),
                point=3.0, milestone="v1.0", labels=[]
            ),
            IssueModel(
                id=3, title="Issue 3", description="", state="opened",
                created_at=base_date, point=1.0, milestone="v1.0", labels=[]
            )
        ]
    
    def test_generate_burn_down_data(self, analyzer, sample_issues):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        chart_data = analyzer.generate_burn_down_data(
            sample_issues, start_date, end_date, "v1.0"
        )
        
        assert len(chart_data) == 7  # 7日間
        assert chart_data[0].remaining_points == 6.0  # 初日は全ポイント残り
        assert chart_data[2].remaining_points == 4.0  # 3日目：2ポイント完了
        assert chart_data[5].remaining_points == 1.0  # 6日目：5ポイント完了
    
    def test_generate_burn_up_data(self, analyzer, sample_issues):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        chart_data = analyzer.generate_burn_up_data(
            sample_issues, start_date, end_date, "v1.0"
        )
        
        assert len(chart_data) == 7
        assert chart_data[0].completed_points == 0.0  # 初日は完了ポイントなし
        assert chart_data[2].completed_points == 2.0  # 3日目：2ポイント完了
        assert chart_data[5].completed_points == 5.0  # 6日目：5ポイント完了
    
    def test_calculate_completed_points_by_date(self, analyzer, sample_issues):
        target_date = date(2024, 1, 3)
        completed = analyzer._calculate_completed_points_by_date(sample_issues, target_date)
        assert completed == 2.0  # Issue 1のみ完了
        
        target_date = date(2024, 1, 6)
        completed = analyzer._calculate_completed_points_by_date(sample_issues, target_date)
        assert completed == 5.0  # Issue 1, 2完了
    
    def test_count_completed_issues_by_date(self, analyzer, sample_issues):
        target_date = date(2024, 1, 3)
        count = analyzer._count_completed_issues_by_date(sample_issues, target_date)
        assert count == 1  # Issue 1のみ完了
        
        target_date = date(2024, 1, 6)
        count = analyzer._count_completed_issues_by_date(sample_issues, target_date)
        assert count == 2  # Issue 1, 2完了
    
    def test_filter_by_milestone(self, analyzer, sample_issues):
        # v1.0のマイルストーンでフィルタ
        filtered = analyzer._filter_by_milestone(sample_issues, "v1.0")
        assert len(filtered) == 3
        
        # 存在しないマイルストーンでフィルタ
        filtered = analyzer._filter_by_milestone(sample_issues, "v2.0")
        assert len(filtered) == 0
        
        # マイルストーン指定なし
        filtered = analyzer._filter_by_milestone(sample_issues, None)
        assert len(filtered) == 3
    
    def test_generate_date_range(self, analyzer):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 3)
        
        date_range = analyzer._generate_date_range(start_date, end_date)
        expected = [date(2024, 1, 1), date(2024, 1, 2), date(2024, 1, 3)]
        assert date_range == expected
    
    def test_calculate_ideal_remaining(self, analyzer):
        total_points = 10.0
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 11)  # 10日間
        
        # 開始前
        current_date = date(2023, 12, 31)
        ideal = analyzer._calculate_ideal_remaining(total_points, start_date, end_date, current_date)
        assert ideal == 10.0
        
        # 中間点（5日目）
        current_date = date(2024, 1, 6)
        ideal = analyzer._calculate_ideal_remaining(total_points, start_date, end_date, current_date)
        assert ideal == 5.0
        
        # 終了後
        current_date = date(2024, 1, 12)
        ideal = analyzer._calculate_ideal_remaining(total_points, start_date, end_date, current_date)
        assert ideal == 0.0
    
    def test_calculate_ideal_completed(self, analyzer):
        total_points = 10.0
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 11)  # 10日間
        
        # 開始前
        current_date = date(2023, 12, 31)
        ideal = analyzer._calculate_ideal_completed(total_points, start_date, end_date, current_date)
        assert ideal == 0.0
        
        # 中間点（5日目）
        current_date = date(2024, 1, 6)
        ideal = analyzer._calculate_ideal_completed(total_points, start_date, end_date, current_date)
        assert ideal == 5.0
        
        # 終了後
        current_date = date(2024, 1, 12)
        ideal = analyzer._calculate_ideal_completed(total_points, start_date, end_date, current_date)
        assert ideal == 10.0
    
    def test_generate_velocity_data(self, analyzer, sample_issues):
        velocity_data = analyzer.generate_velocity_data(sample_issues, weeks=4)
        
        # 完了issueがある週のデータが含まれること
        assert len(velocity_data) > 0
        assert all('completed_points' in v for v in velocity_data)
        assert all('completed_issues' in v for v in velocity_data)
        assert all('week_start' in v for v in velocity_data)
        assert all('week_end' in v for v in velocity_data)
    
    def test_is_issue_in_scope_by_date(self, analyzer, sample_issues):
        # 作成日より後の日付
        target_date = date(2024, 1, 2)
        assert analyzer._is_issue_in_scope_by_date(sample_issues[0], target_date) == True
        
        # 作成日より前の日付
        target_date = date(2023, 12, 31)
        assert analyzer._is_issue_in_scope_by_date(sample_issues[0], target_date) == False
    
    def test_calculate_total_points_by_date(self, analyzer, sample_issues):
        date_range = [date(2023, 12, 31), date(2024, 1, 1), date(2024, 1, 2)]
        total_by_date = analyzer._calculate_total_points_by_date(sample_issues, date_range)
        
        # 作成前の日は0ポイント
        assert total_by_date[date(2023, 12, 31)] == 0.0
        # 作成後は全ポイント
        assert total_by_date[date(2024, 1, 1)] == 6.0
        assert total_by_date[date(2024, 1, 2)] == 6.0
    
    def test_count_issues_in_week(self, analyzer, sample_issues):
        week_start = date(2023, 12, 25)  # 月曜日
        week_end = date(2023, 12, 31)    # 日曜日
        
        # この週には完了issueがない
        count = analyzer._count_issues_in_week(sample_issues, week_start, week_end)
        assert count == 0
        
        # Issue 1が完了する週
        week_start = date(2024, 1, 1)
        week_end = date(2024, 1, 7)
        count = analyzer._count_issues_in_week(sample_issues, week_start, week_end)
        assert count == 2  # Issue 1, 2が完了
    
    def test_empty_issues_list(self, analyzer):
        empty_issues = []
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        # Burn-downデータ
        chart_data = analyzer.generate_burn_down_data(empty_issues, start_date, end_date)
        assert len(chart_data) == 7
        assert all(data.remaining_points == 0.0 for data in chart_data)
        assert all(data.completed_points == 0.0 for data in chart_data)
        
        # Burn-upデータ
        chart_data = analyzer.generate_burn_up_data(empty_issues, start_date, end_date)
        assert len(chart_data) == 7
        assert all(data.completed_points == 0.0 for data in chart_data)
        assert all(data.total_points == 0.0 for data in chart_data)
        
        # ベロシティデータ
        velocity_data = analyzer.generate_velocity_data(empty_issues)
        assert len(velocity_data) == 0
    
    def test_issues_without_points(self, analyzer):
        # ポイントなしのissue
        issues_no_points = [
            IssueModel(
                id=1, title="Issue 1", description="", state="closed",
                created_at=datetime(2024, 1, 1), completed_at=datetime(2024, 1, 3),
                point=None, milestone="v1.0", labels=[]
            )
        ]
        
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        chart_data = analyzer.generate_burn_down_data(issues_no_points, start_date, end_date)
        assert all(data.remaining_points == 0.0 for data in chart_data)
        assert all(data.completed_points == 0.0 for data in chart_data)
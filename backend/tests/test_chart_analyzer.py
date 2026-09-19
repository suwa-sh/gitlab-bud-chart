"""ChartAnalyzer のテスト"""

from datetime import date, datetime, timezone
from typing import Any, Optional

import pytest

from app.models.issue import IssueModel
from app.services.chart_analyzer import ChartAnalyzer

# 2025-06-02(月) 〜 2025-06-06(金): 平日5日、祝日なし
START = date(2025, 6, 2)
END = date(2025, 6, 6)


def utc(day: int) -> datetime:
    return datetime(2025, 6, day, tzinfo=timezone.utc)


def build_issue(
    point: Optional[float],
    created_day: int = 1,
    completed_day: Optional[int] = None,
    **overrides: Any,
) -> IssueModel:
    values = {
        "id": 1,
        "iid": 1,
        "title": "issue",
        "description": "",
        "state": "closed" if completed_day else "opened",
        "created_at": utc(created_day),
        "point": point,
        "completed_at": utc(completed_day) if completed_day else None,
    }
    values.update(overrides)
    return IssueModel(**values)


@pytest.fixture
def analyzer() -> ChartAnalyzer:
    return ChartAnalyzer()


def test_burn_down_has_one_row_per_calendar_day(analyzer: ChartAnalyzer):
    data = analyzer.generate_burn_down_data([build_issue(3)], START, END)

    assert [row.date for row in data] == [date(2025, 6, day) for day in range(2, 7)]


def test_burn_down_remaining_decreases_on_completion_date(analyzer: ChartAnalyzer):
    issues = [
        build_issue(3, completed_day=3),
        build_issue(5, completed_day=5),
        build_issue(2),
    ]

    data = analyzer.generate_burn_down_data(issues, START, END)

    assert [row.total_points for row in data] == [10, 10, 10, 10, 10]
    assert [row.completed_points for row in data] == [0, 3, 3, 8, 8]
    assert [row.remaining_points for row in data] == [10, 7, 7, 2, 2]
    assert [row.actual_points for row in data] == [10, 7, 7, 2, 2]


def test_burn_down_ideal_line_runs_from_total_to_zero(analyzer: ChartAnalyzer):
    data = analyzer.generate_burn_down_data([build_issue(10)], START, END)

    assert data[0].planned_points == 10
    assert data[-1].planned_points == 0


def test_burn_up_scope_grows_on_created_date(analyzer: ChartAnalyzer):
    issues = [build_issue(3, created_day=1), build_issue(5, created_day=4)]

    data = analyzer.generate_burn_up_data(issues, START, END)

    assert [row.total_points for row in data] == [3, 3, 8, 8, 8]


def test_burn_up_completed_points_accumulate(analyzer: ChartAnalyzer):
    issues = [
        build_issue(3, completed_day=3),
        build_issue(5, completed_day=5),
        build_issue(2),
    ]

    data = analyzer.generate_burn_up_data(issues, START, END)

    assert [row.completed_points for row in data] == [0, 3, 3, 8, 8]
    assert [row.actual_points for row in data] == [0, 3, 3, 8, 8]


def test_burn_down_and_burn_up_agree_on_completed_points(analyzer: ChartAnalyzer):
    # フロントエンドは「現在のペース」を両チャート共通の値として1か所に表示する。
    # その前提として、完了ポイントの推移が両チャートで一致していることを固定する
    issues = [
        build_issue(3, completed_day=3),
        build_issue(5, completed_day=5),
        build_issue(2),
    ]

    burn_down = analyzer.generate_burn_down_data(issues, START, END)
    burn_up = analyzer.generate_burn_up_data(issues, START, END)

    assert [row.completed_points for row in burn_down] == [
        row.completed_points for row in burn_up
    ]
    assert burn_down[-1].total_points == burn_up[-1].total_points


def test_issues_without_point_do_not_affect_points(analyzer: ChartAnalyzer):
    issues = [build_issue(None, completed_day=3), build_issue(4, completed_day=4)]

    data = analyzer.generate_burn_down_data(issues, START, END)

    assert data[0].total_points == 4
    assert [row.completed_points for row in data] == [0, 0, 4, 4, 4]
    assert [row.completed_issues for row in data] == [0, 1, 2, 2, 2]


def test_empty_issues_produce_zero_rows(analyzer: ChartAnalyzer):
    data = analyzer.generate_burn_down_data([], START, END)

    assert len(data) == 5
    assert all(row.total_points == 0 and row.remaining_points == 0 for row in data)

"""apply_advanced_filters のテスト

frontend/src/utils/filterUtils.test.ts と同じ仕様を固定する。
Dashboard はテーブルを frontend、チャートを backend で絞り込むため、両者の挙動が食い違うと表示が一致しなくなる。
"""

from datetime import date, datetime, timezone
from typing import Any, List

from app.models.issue import IssueModel
from app.utils.shared_filters import apply_advanced_filters


def build_issue(**overrides: Any) -> IssueModel:
    values = {
        "id": 1,
        "iid": 1,
        "title": "issue",
        "description": "",
        "state": "opened",
        "created_at": datetime(2025, 6, 2, tzinfo=timezone.utc),
    }
    values.update(overrides)
    return IssueModel(**values)


def titles(issues: List[IssueModel]) -> List[str]:
    return [issue.title for issue in issues]


def test_no_filters_returns_all_issues():
    issues = [build_issue(title="a"), build_issue(title="b")]

    assert titles(apply_advanced_filters(issues)) == ["a", "b"]


def test_point_filter_accepts_zero_as_boundary():
    issues = [build_issue(title="zero", point=0), build_issue(title="three", point=3)]

    assert titles(apply_advanced_filters(issues, min_point=0)) == ["zero", "three"]
    assert titles(apply_advanced_filters(issues, max_point=0)) == ["zero"]


def test_point_filter_excludes_issues_without_point():
    issues = [build_issue(title="none"), build_issue(title="five", point=5)]

    assert titles(apply_advanced_filters(issues, min_point=1)) == ["five"]
    assert titles(apply_advanced_filters(issues, max_point=8)) == ["five"]


def test_search_matches_title_and_description_case_insensitively():
    issues = [
        build_issue(title="in title: Login"),
        build_issue(title="in description", description="fix LOGIN flow"),
        build_issue(title="unrelated", description="other"),
    ]

    assert titles(apply_advanced_filters(issues, search="login")) == [
        "in title: Login",
        "in description",
    ]


def test_state_all_means_no_state_filter():
    issues = [
        build_issue(title="open", state="opened"),
        build_issue(title="closed", state="closed"),
    ]

    assert titles(apply_advanced_filters(issues, state="all")) == ["open", "closed"]
    assert titles(apply_advanced_filters(issues, state="closed")) == ["closed"]


def test_completed_after_excludes_incomplete_issues():
    issues = [
        build_issue(title="open"),
        build_issue(
            title="done", completed_at=datetime(2025, 6, 10, tzinfo=timezone.utc)
        ),
    ]

    result = apply_advanced_filters(issues, completed_after=date(2025, 6, 1))

    assert titles(result) == ["done"]


def test_completed_before_only_keeps_incomplete_issues():
    issues = [
        build_issue(title="open"),
        build_issue(
            title="late", completed_at=datetime(2025, 6, 20, tzinfo=timezone.utc)
        ),
        build_issue(
            title="done", completed_at=datetime(2025, 6, 10, tzinfo=timezone.utc)
        ),
    ]

    result = apply_advanced_filters(issues, completed_before=date(2025, 6, 15))

    assert titles(result) == ["open", "done"]


def test_epic_filter_treats_missing_flag_as_normal():
    issues = [
        build_issue(title="epic", is_epic=True),
        build_issue(title="normal", is_epic=False),
        build_issue(title="unset"),
    ]

    assert titles(apply_advanced_filters(issues, is_epic="epic")) == ["epic"]
    assert titles(apply_advanced_filters(issues, is_epic="normal")) == [
        "normal",
        "unset",
    ]


def test_multiple_filters_are_combined_with_and():
    issues = [
        build_issue(title="login api", service="auth", state="opened"),
        build_issue(title="login ui", service="web", state="opened"),
        build_issue(title="login batch", service="auth", state="closed"),
    ]

    result = apply_advanced_filters(
        issues, search="LOGIN", service="auth", state="opened"
    )

    assert titles(result) == ["login api"]

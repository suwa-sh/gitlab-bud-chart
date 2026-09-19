"""scripts/generate_gitlab_test_data.py のうち、実行日の四半期のサンプルを作る純粋関数のテスト

スクリプトはパッケージではないので、ファイルパスから読み込む。GitLab へは接続しない。
"""

import importlib.util
from datetime import date, datetime
from pathlib import Path

import pytest

SCRIPT = (
    Path(__file__).resolve().parents[2] / "scripts" / "generate_gitlab_test_data.py"
)
spec = importlib.util.spec_from_file_location("generate_gitlab_test_data", SCRIPT)
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


@pytest.mark.parametrize(
    "target, expected",
    [
        pytest.param(
            date(2026, 9, 19),
            ("FY26Q2", date(2026, 7, 1), date(2026, 9, 30)),
            id="Q2の途中",
        ),
        pytest.param(
            date(2026, 4, 1),
            ("FY26Q1", date(2026, 4, 1), date(2026, 6, 30)),
            id="年度の初日",
        ),
        pytest.param(
            date(2026, 12, 31),
            ("FY26Q3", date(2026, 10, 1), date(2026, 12, 31)),
            id="Q3の最終日",
        ),
        pytest.param(
            date(2024, 2, 1),
            ("FY23Q4", date(2024, 1, 1), date(2024, 3, 31)),
            id="1〜3月は前年度のQ4",
        ),
        pytest.param(
            date(2024, 3, 31),
            ("FY23Q4", date(2024, 1, 1), date(2024, 3, 31)),
            id="うるう年のQ4最終日",
        ),
        pytest.param(
            date(2100, 5, 5),
            ("FY00Q1", date(2100, 4, 1), date(2100, 6, 30)),
            id="年度の下2桁は0埋め",
        ),
    ],
)
def test_fiscal_quarter_of(target, expected):
    assert script.fiscal_quarter_of(target) == expected


def test_readme_scope_example_period_is_fy23q4():
    # README のスコープ判定例 (2024-01-01〜03-31) と固定データのラベル @FY23Q4 が対応していること
    label, start, end = script.fiscal_quarter_of(date(2024, 1, 1))

    assert (label, start.isoformat(), end.isoformat()) == (
        "FY23Q4",
        script.TEST_PERIOD_START,
        script.TEST_PERIOD_END,
    )


def parse(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").date()


@pytest.mark.parametrize(
    "today",
    [
        pytest.param(date(2026, 9, 19), id="四半期の終盤"),
        pytest.param(date(2026, 8, 15), id="四半期の中盤"),
        pytest.param(date(2026, 7, 2), id="四半期の2日目"),
        pytest.param(date(2026, 7, 1), id="四半期の初日"),
        pytest.param(date(2026, 9, 30), id="四半期の最終日"),
    ],
)
def test_current_quarter_issues_never_use_future_dates(today):
    _, start, _ = script.fiscal_quarter_of(today)

    issues = script.build_current_quarter_issues(today)

    for issue in issues:
        created = parse(issue["custom_created_at"])
        assert start <= created <= today
        if issue["closed"]:
            completed = parse(issue["due_date"])
            assert created <= completed <= today


def test_current_quarter_issues_carry_the_quarter_label():
    issues = script.build_current_quarter_issues(date(2026, 9, 19))

    assert len(issues) == len(script.CURRENT_QUARTER_SAMPLES)
    assert all("@FY26Q2" in issue["labels"] for issue in issues)


def test_completed_issues_have_due_date_and_open_issues_do_not():
    # completed_at は due_date から決まる。完了 issue に due_date が無いと「Due Date 未設定」の警告対象になる
    issues = script.build_current_quarter_issues(date(2026, 9, 19))

    done = [issue for issue in issues if issue["closed"]]
    todo = [issue for issue in issues if not issue["closed"]]

    assert done and todo
    assert all("due_date" in issue and "#完了" in issue["labels"] for issue in done)
    assert all(
        "due_date" not in issue and "#完了" not in issue["labels"] for issue in todo
    )


def test_completion_dates_are_spread_over_the_elapsed_period():
    # 完了日が 1 日に固まると、チャートが階段 1 段になって「現在のペース」の確認に使えない
    issues = script.build_current_quarter_issues(date(2026, 9, 19))

    completed = sorted(
        {parse(issue["due_date"]) for issue in issues if issue["closed"]}
    )

    assert len(completed) >= 8
    assert (completed[-1] - completed[0]).days >= 45

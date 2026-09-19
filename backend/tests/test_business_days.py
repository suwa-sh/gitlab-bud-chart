"""BusinessDayCalculator のテスト"""

from datetime import date

import pytest

from app.utils.business_days import BusinessDayCalculator


@pytest.fixture
def calculator() -> BusinessDayCalculator:
    return BusinessDayCalculator()


def test_weekday_is_business_day(calculator: BusinessDayCalculator):
    assert calculator.is_business_day(date(2025, 6, 2)) is True  # 月曜


def test_weekend_is_not_business_day(calculator: BusinessDayCalculator):
    assert calculator.is_business_day(date(2025, 6, 7)) is False  # 土曜
    assert calculator.is_business_day(date(2025, 6, 8)) is False  # 日曜


def test_japanese_holiday_is_not_business_day(calculator: BusinessDayCalculator):
    assert calculator.is_business_day(date(2025, 1, 1)) is False  # 元日（水曜）


def test_count_business_days_includes_both_ends(calculator: BusinessDayCalculator):
    # 2025-06-02(月) 〜 2025-06-13(金): 平日10日、祝日なし
    assert calculator.count_business_days(date(2025, 6, 2), date(2025, 6, 13)) == 10


def test_count_business_days_skips_holiday(calculator: BusinessDayCalculator):
    # 2025-07-21(月) は海の日
    assert calculator.count_business_days(date(2025, 7, 21), date(2025, 7, 25)) == 4


def test_progress_is_clamped_to_period(calculator: BusinessDayCalculator):
    start, end = date(2025, 6, 2), date(2025, 6, 13)

    assert (
        calculator.calculate_business_day_progress(start, end, date(2025, 5, 30)) == 0.0
    )
    assert calculator.calculate_business_day_progress(start, end, start) == 0.0
    assert calculator.calculate_business_day_progress(start, end, end) == 1.0
    assert (
        calculator.calculate_business_day_progress(start, end, date(2025, 6, 20)) == 1.0
    )


def test_progress_does_not_advance_over_weekend(calculator: BusinessDayCalculator):
    start, end = date(2025, 6, 2), date(2025, 6, 13)

    friday = calculator.calculate_business_day_progress(start, end, date(2025, 6, 6))
    sunday = calculator.calculate_business_day_progress(start, end, date(2025, 6, 8))

    assert friday == pytest.approx(0.5)
    assert sunday == friday

import inspect

import pytest

from src.usecase.draw_chart_usecase import DrawChartUsecase
from tests.libs.csv_utils import make_dir, move

DIR_INPUT_BASE = "tests/data/input/draw_chart"
DIR_OUTPUT_BASE = "tests/data/output/draw_chart"


def test_outputを目検__ハッピーパス__データに予定ポイントと実績ポイントがある場合_予定と実績があるチャート画像とサマリを出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_dir = f"{DIR_INPUT_BASE}/glissue_FY24Q1"
    result_dir = f"{DIR_OUTPUT_BASE}/{function_name}"

    # when
    usecase = DrawChartUsecase(input_dir)
    usecase.execute()

    # then
    make_dir(result_dir)
    move(f"{input_dir}/burn-down.svg", f"{result_dir}/burn-down.svg")
    move(f"{input_dir}/burn-up.svg", f"{result_dir}/burn-up.svg")
    move(f"{input_dir}/summary.txt", f"{result_dir}/summary.txt")


def test_outputを目検__ファイルの内容__データに実績ポイントがない場合_実績がないチャート画像とサマリを出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_dir = f"{DIR_INPUT_BASE}/no_progress"
    result_dir = f"{DIR_OUTPUT_BASE}/{function_name}"

    # when
    usecase = DrawChartUsecase(input_dir)
    usecase.execute()

    # then
    make_dir(result_dir)
    move(f"{input_dir}/burn-down.svg", f"{result_dir}/burn-down.svg")
    move(f"{input_dir}/burn-up.svg", f"{result_dir}/burn-up.svg")
    move(f"{input_dir}/summary.txt", f"{result_dir}/summary.txt")


def test_ファイルの内容__データが空の場合_エラー終了() -> None:
    # given
    input_dir = f"{DIR_INPUT_BASE}/empty_csv"

    # when
    usecase = DrawChartUsecase(input_dir)

    # then
    with pytest.raises(ValueError, match="No columns to parse from file"):
        usecase.execute()


def test_ファイルの内容__フォーマットが想定外の場合_エラー終了() -> None:
    # given
    input_dir = f"{DIR_INPUT_BASE}/invalid_csv"

    # when
    usecase = DrawChartUsecase(input_dir)

    # then
    with pytest.raises(KeyError):
        usecase.execute()


def test_ファイルパス__入力ディレクトリが存在しない場合_エラー終了() -> None:
    # given
    input_dir = f"{DIR_INPUT_BASE}/dir_not_exists"

    # when
    usecase = DrawChartUsecase(input_dir)

    # then
    with pytest.raises(FileNotFoundError):
        usecase.execute()


def test_ファイルパス__名前がマッチするファイルがない場合_エラー終了() -> None:
    # given
    input_dir = f"{DIR_INPUT_BASE}/file_not_exists"

    # when
    usecase = DrawChartUsecase(input_dir)

    # then
    with pytest.raises(FileNotFoundError):
        usecase.execute()

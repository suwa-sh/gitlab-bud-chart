import inspect

import pytest
from usecase.write_glissue_html_usecase import WriteGlissueHtmlUsecase

from tests.libs.csv_utils import move

DIR_INPUT = "tests/data/input/write_glissue_html"
DIR_OUTPUT = "tests/data/output/write_glissue_html"


def test_outputを目検__ハッピーパス__CSVファイルが正常な場合_htmlを出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}.html"

    # when
    usecase = WriteGlissueHtmlUsecase(input_path)
    usecase.execute()

    # then
    move(f"{DIR_INPUT}/viewer.html", result_path)


def test_ファイルの内容__データが空の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/empty.csv"

    # when
    usecase = WriteGlissueHtmlUsecase(input_path)

    # then
    with pytest.raises(ValueError, match="No columns to parse from file"):
        usecase.execute()


def test_ファイルの内容__フォーマットが想定外の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/invalid_format.csv"

    # when
    usecase = WriteGlissueHtmlUsecase(input_path)

    # then
    with pytest.raises(KeyError):
        usecase.execute()


def test_ファイルパス__入力ファイルが存在しない場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/file_not_exists"

    # when
    usecase = WriteGlissueHtmlUsecase(input_path)

    # then
    with pytest.raises(FileNotFoundError):
        usecase.execute()

import inspect

import pytest

from src.usecase.transform_glissue_usecase import TransformGlissueUsecase
from tests.libs.csv_utils import assert_csv_file_equals, move

DIR_INPUT = "tests/data/input/transform_glissue"
DIR_OUTPUT = "tests/data/output/transform_glissue"
DIR_EXPECT = "tests/data/expect/transform_glissue"


def test_ハッピーパス__データ期間が指定期間と一致する場合_すべてのデータをファイル出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/glissue_FY24Q1.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)
    usecase.execute("2024-04-01", "2024-06-30")

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)


def test_ファイルの内容__データに実績ポイントがない場合_実績がNoneのファイルを出力する() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/no_progress.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/no_progress.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)
    usecase.execute("2024-04-01", "2024-06-30")

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)


def test_ファイルの内容__データが空の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/empty.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)

    # then
    with pytest.raises(ValueError, match="No columns to parse from file"):
        usecase.execute("2024-04-01", "2024-06-30")


def test_ファイルの内容__フォーマットが想定外の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/invalid_format.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)

    # then
    with pytest.raises(KeyError):
        usecase.execute("2024-04-01", "2024-06-30")


def test_期間の組み合わせ__データ期間が指定期間より前の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)

    # then
    with pytest.raises(ValueError, match="CSV中に有効なデータがありません。"):
        usecase.execute("2024-07-01", "2024-09-30")


def test_期間の組み合わせ__データ期間が指定期間より前で_一部含まれる場合_含まれる期間のファイルを出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/0301_0531.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)
    usecase.execute("2024-03-01", "2024-05-31")

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)


def test_期間の組み合わせ__データ期間が指定期間に含まれる場合_すべてのデータをファイル出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/0301_0731.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)
    usecase.execute("2024-03-01", "2024-07-31")

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)


def test_期間の組み合わせ__データ期間が指定期間より後で_一部含まれる場合_含まれる期間のファイルを出力() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/0601_0831.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)
    usecase.execute("2024-06-01", "2024-08-31")

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)


def test_期間の組み合わせ__データ期間が指定期間より後の場合_エラー終了() -> None:
    # given
    input_path = f"{DIR_INPUT}/glissue_FY24Q1.csv"

    # when
    usecase = TransformGlissueUsecase(input_path)

    # then
    with pytest.raises(ValueError, match="CSV中に有効なデータがありません。"):
        usecase.execute("2024-01-01", "2024-03-31")

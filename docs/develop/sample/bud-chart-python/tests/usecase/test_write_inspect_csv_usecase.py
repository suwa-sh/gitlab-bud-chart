import inspect

from usecase.write_inspection_csv_usecase import WriteInspectionCsvUsecase

from tests.libs.csv_utils import assert_csv_file_equals, move

DIR_INPUT = "tests/data/input/write_inspection_csv"
DIR_OUTPUT = "tests/data/output/write_inspection_csv"
DIR_EXPECT = "tests/data/expect/write_inspection_csv"


def test_ハッピーパス() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore

    input_path = f"{DIR_INPUT}/glissue_2024-08-22.csv"
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/inspection_2024-07-20_2024-08-20.csv"

    # when
    usecase = WriteInspectionCsvUsecase(input_path, "2024-07-20", "2024-08-20")
    usecase.execute()

    # then
    move(f"{DIR_INPUT}/inspection_2024-07-20_2024-08-20.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)

import inspect
from unittest.mock import patch

from src.main.transform_glissue import main
from tests.libs.csv_utils import assert_csv_file_equals, move

DIR_INPUT = "tests/data/input/transform_glissue"
DIR_OUTPUT = "tests/data/output/transform_glissue"
DIR_EXPECT = "tests/data/expect/transform_glissue"


def test_main_ハッピーパス() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore
    result_path = f"{DIR_OUTPUT}/{function_name}"
    expect_path = f"{DIR_EXPECT}/glissue_FY24Q1.csv"

    # when
    with patch(
        "sys.argv",
        [
            "program",
            "-i",
            "tests/data/input/transform_glissue/glissue_FY24Q1.csv",
            "-s",
            "2024-04-01",
            "-e",
            "2024-06-30",
        ],
    ):
        main()

    # then
    move(f"{DIR_INPUT}/burn-up-down.csv", result_path)
    assert_csv_file_equals(result_path, expect_path)

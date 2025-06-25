import inspect
from unittest.mock import patch

from src.main.draw_chart import main
from tests.libs.csv_utils import make_dir, move

DIR_INPUT_BASE = "tests/data/input/draw_chart"
DIR_OUTPUT_BASE = "tests/data/output/draw_chart"


def test_outputを目検__main_ハッピーパス() -> None:
    # given
    function_name = inspect.currentframe().f_code.co_name  # type: ignore
    input_dir = f"{DIR_INPUT_BASE}/glissue_FY24Q1"
    result_dir = f"{DIR_OUTPUT_BASE}/{function_name}"

    # when
    with patch(
        "sys.argv",
        [
            "program",
            "-i",
            "tests/data/input/draw_chart/glissue_FY24Q1",
        ],
    ):
        main()

    # then
    make_dir(result_dir)
    move(f"{input_dir}/burn-down.svg", f"{result_dir}/burn_down.svg")
    move(f"{input_dir}/burn-up.svg", f"{result_dir}/burn_up.svg")
    move(f"{input_dir}/summary.txt", f"{result_dir}/summary.txt")

import os
import shutil

import pandas as pd


def make_dir(dir: str) -> None:
    if not os.path.isdir(dir):
        os.mkdir(dir)


def move(from_path: str, to_path: str) -> None:
    # f"tests/data/input/{target}/burn-up-down.csv"
    shutil.move(from_path, to_path)


def assert_csv_file_equals(result_path: str, expect_path: str) -> None:
    # result_file_path = f"tests/data/output/{target}/{result_file_name}"
    # expect_file_path = f"tests/data/expect/{target}/{expect_file_name}"
    result = pd.read_csv(result_path)
    expect = pd.read_csv(expect_path)
    pd.testing.assert_frame_equal(result, expect)

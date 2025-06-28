#!/usr/bin/env python

import argparse
import logging

from main.validation_types import dir_type
from usecase.draw_chart_usecase import DrawChartUsecase

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s", datefmt="%Y-%m-%d %I:%M:%S %p")


def main() -> None:
    # 引数チェック
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-i",
        "--input_dir",
        help="input_dir 入力ディレクトリ ex: /tmp",
        type=dir_type,
        required=True,
    )
    args = parser.parse_args()

    # ユースケース呼び出し
    draw_chart_usecase = DrawChartUsecase(args.input_dir)
    draw_chart_usecase.execute()


if __name__ == "__main__":
    main()

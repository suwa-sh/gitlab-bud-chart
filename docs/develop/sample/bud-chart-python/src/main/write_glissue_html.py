#!/usr/bin/env python

import argparse
import logging

from main.validation_types import file_path_type
from usecase.write_glissue_html_usecase import WriteGlissueHtmlUsecase

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s", datefmt="%Y-%m-%d %I:%M:%S %p")


def main() -> None:
    # 引数チェック
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-i",
        "--input_file_path",
        help="input_file_path 入力ファイルパス ex: /tmp/glissue.csv",
        type=file_path_type,
        required=True,
    )
    args = parser.parse_args()

    # ユースケース呼び出し
    glissue_viewer_usecase = WriteGlissueHtmlUsecase(args.input_file_path)
    glissue_viewer_usecase.execute()


if __name__ == "__main__":
    main()

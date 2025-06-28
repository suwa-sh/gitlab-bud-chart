#!/usr/bin/env python

import argparse
import logging

from main.validation_types import date_str_type, file_path_type
from usecase.write_inspection_csv_usecase import WriteInspectionCsvUsecase

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
    parser.add_argument(
        "-s",
        "--start_date",
        help="start_date 検収期間の開始日 ex: 2024-04-01",
        type=date_str_type,
        required=True,
    )
    parser.add_argument(
        "-e",
        "--end_date",
        help="end_date 検収期間の終了日 ex: 2024-06-30",
        type=date_str_type,
        required=True,
    )
    args = parser.parse_args()

    # ユースケース呼び出し
    usecase = WriteInspectionCsvUsecase(args.input_file_path, args.start_date, args.end_date)
    output_file_path = usecase.execute()
    print(f"output file: {output_file_path}")


if __name__ == "__main__":
    main()

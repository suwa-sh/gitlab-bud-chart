import argparse
from datetime import datetime
from pathlib import Path


def file_path_type(file_path_str: str) -> str:
    path = Path(file_path_str)
    if not path.exists():
        raise argparse.ArgumentTypeError(f"ファイルが存在しません。: {file_path_str}")
    if path.suffix != ".csv":
        raise argparse.ArgumentTypeError(f"拡張子がcsvではありません。: {path.suffix}")
    return file_path_str


def date_str_type(date_str: str) -> str:
    try:
        datetime.fromisoformat(date_str)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"日付に変換できませんでした。: {date_str} cause: {str(e)}")
    return date_str


def dir_type(dir_str: str) -> str:
    path = Path(dir_str)
    if not path.is_dir():
        raise argparse.ArgumentTypeError(f"ディレクトリが存在しません。: {dir_str}")
    return dir_str

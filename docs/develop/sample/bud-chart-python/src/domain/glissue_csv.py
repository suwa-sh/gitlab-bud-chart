from datetime import datetime
from logging import getLogger

import pandas as pd
from domain.progress import Progress
from domain.schedule import Schedule
from numpy import nan

logger = getLogger(__name__)


class GlissueCsv:
    DEFAULT_VALUE = "-"
    LABEL_NAMES = [f"label{i}" for i in range(1, 11)]

    raw_csv = pd.DataFrame()
    cleansed = pd.DataFrame()

    def __init__(self, csv: pd.DataFrame) -> None:
        # カラムを追加してlabelsのパース結果を入れる
        csv = self.__append_kanban_status_col(csv)
        csv = self.__append_quarter_col(csv)
        csv = self.__append_is_epic_col(csv)
        csv = self.__append_point_col(csv)
        csv = self.__append_service_col(csv)

        # GitLabの期日は、完了日として扱う
        csv = csv.rename({"due_date": "completed_at"}, axis=1)

        # 必要なカラムのみに絞る
        csv = csv[
            [
                "milestone",
                "service",
                "is_epic",
                "title",
                "point",
                "kanban_status",
                "assignee",
                "quarter",
                "created_at",
                "completed_at",
                "state",
                "web_url",
            ]
        ]

        self.raw_csv = csv

    def __append_kanban_status_col(self, csv: pd.DataFrame) -> pd.DataFrame:
        csv["kanban_status"] = self.DEFAULT_VALUE
        for index, row in csv.iterrows():
            # prefixが#のlabelの値を入れる
            csv.at[index, "kanban_status"] = self.__get_label_value_str(row, "#")
        return csv

    def __append_quarter_col(self, csv: pd.DataFrame) -> pd.DataFrame:
        csv["quarter"] = self.DEFAULT_VALUE
        for index, row in csv.iterrows():
            # prefixが@のlabelの値を入れる
            csv.at[index, "quarter"] = self.__get_label_value_str(row, "@")
        return csv

    def __append_service_col(self, csv: pd.DataFrame) -> pd.DataFrame:
        csv["service"] = self.DEFAULT_VALUE
        for index, row in csv.iterrows():
            # prefixがs:のlabelの値を入れる
            csv.at[index, "service"] = self.__get_label_value_str(row, "s:")
        return csv

    def __append_point_col(self, csv: pd.DataFrame) -> pd.DataFrame:
        csv["point"] = nan
        for index, row in csv.iterrows():
            # prefixがp:のlabelの値をfloatに変換して入れる
            csv.at[index, "point"] = self.__get_label_value_float(row, "p:")
        return csv

    def __append_is_epic_col(self, csv: pd.DataFrame) -> pd.DataFrame:
        csv["is_epic"] = False
        for index, row in csv.iterrows():
            csv.at[index, "is_epic"] = self.__is_epic(row)
        return csv

    def __get_label_value_str(self, row: dict, prefix: str) -> str:
        # label1〜10を順に見ていく
        for label in self.LABEL_NAMES:
            # prefixが一致するなら、prefixの後ろを値として取得
            if str(row[label]).startswith(prefix):
                return str(row[label])[len(prefix) :]
        return self.DEFAULT_VALUE

    def __get_label_value_float(self, row: dict, prefix: str) -> float:
        # label1〜10を順に見ていく
        for label in self.LABEL_NAMES:
            # prefixが一致するなら、prefixの後ろを値として取得
            if str(row[label]).startswith(prefix):
                str_value = str(row[label])[len(prefix) :]
                return float(str_value)
        return nan

    def __is_epic(self, row: dict) -> float:
        is_epic = False
        # label1〜10にepicがあるかを順に見ていく
        for label in self.LABEL_NAMES:
            if str(row[label]) == "epic":
                is_epic = True
                break
        return is_epic

    def raw(self) -> pd.DataFrame:
        return self.raw_csv.copy()

    def default_value(self) -> str:
        return self.DEFAULT_VALUE

    def cleansing(self, start_date_str: str, end_date_str: str) -> None:
        csv = self.raw()

        csv = self.__update_created_at(csv, start_date_str)
        csv = self.__drop(csv, start_date_str, end_date_str)

        # drop後にデータが残っていない場合はエラー終了
        if len(csv) == 0:
            raise ValueError("CSV中に有効なデータがありません。")

        self.cleansed = csv

    def __update_created_at(self, csv: pd.DataFrame, start_date_str: str) -> pd.DataFrame:
        # 作成日のチェック
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")

        for index, row in csv.iterrows():
            created_at = datetime.strptime(row["created_at"], "%Y-%m-%d")
            if created_at < start_date:
                logger.info(f"作成日をstart_dateに合わせました。作成日がstart_dateよりも前に設定されています。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                csv.at[index, "created_at"] = start_date_str

        return csv

    def __drop(self, csv: pd.DataFrame, start_date_str: str, end_date_str: str) -> pd.DataFrame:
        drops = []
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        for index, row in csv.iterrows():
            # かんばんステータス
            if row["kanban_status"] == "--テンプレート":
                logger.info(f"チャートから除外しました。テンプレートタスクです。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                drops.append(index)
                continue

            # ポイント
            if row["point"] <= 0.0:
                logger.warning(f"チャートから除外しました。ポイントが設定されていません。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                drops.append(index)
                continue

            # 完了日
            if pd.notna(row["completed_at"]):
                completed_at = datetime.strptime(row["completed_at"], "%Y-%m-%d")
                if completed_at < start_date:
                    logger.warning(f"チャートから除外しました。完了日がstart_dateよりも前に設定されています。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                    drops.append(index)

                if end_date < completed_at:
                    logger.warning(f"チャートから除外しました。完了日がend_dateよりも後に設定されています。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                    drops.append(index)

        # 不要な行を削除
        csv = csv.drop(drops)

        return csv

    def to_progress(self) -> pd.DataFrame:
        projection = self.cleansed[["completed_at", "point"]]

        if len(projection) == 0:
            logger.warning("期間内に実績がありません。")

        return Progress(projection.rename({"completed_at": "compreted_on"}, axis="columns"))

    def to_schedule(self) -> pd.DataFrame:
        projection = self.cleansed[["created_at", "point"]]
        return Schedule(projection.rename({"created_at": "created_on"}, axis="columns"))

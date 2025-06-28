import pandas as pd
from domain.glissue_csv import GlissueCsv


class GlissueCsvInspectionRepo:
    def __init__(self, output_dir: str, start_date_str: str, end_date_str: str) -> None:
        self.filepath = f"{output_dir}/inspection_{start_date_str}_{end_date_str}.csv"
        self.start_date_str = start_date_str
        self.end_date_str = end_date_str

    def write(self, glissue_csv: GlissueCsv) -> str:
        df = glissue_csv.raw()

        df = self.__filter(df)
        df = self.__update_layout(df)

        df.to_csv(self.filepath, index=False)
        return self.filepath

    def __filter(self, df: pd.DataFrame) -> pd.DataFrame:
        # 完了日 in 契約期間
        df["completed_at"] = pd.to_datetime(df["completed_at"], format="%Y-%m-%d")
        df = df.query(f"'{self.start_date_str}' <= completed_at <= '{self.end_date_str}'")

        df = df[~df["is_epic"]]
        df = df[df["milestone"] != "-- プロセス"]
        df = df[df["kanban_status"] != "--テンプレート"]
        df = df[df["kanban_status"] != "不要"]
        return df

    def __update_layout(self, df: pd.DataFrame) -> pd.DataFrame:
        # fix TypeError: sequence item 1: expected str instance, float found
        df["service"] = df["service"].astype(str)
        df["milestone"] = df["milestone"].astype(str)
        df["title"] = df["title"].astype(str)

        df["品名"] = df[["service", "milestone", "title"]].agg(" / ".join, axis=1)
        df = df.rename({"web_url": "成果物"}, axis=1)
        df["検収確認"] = ""
        df["再検収確認"] = ""

        # 射影
        df = df[
            [
                "品名",
                "成果物",
                "検収確認",
                "再検収確認",
            ]
        ]

        # ソート
        df = df.sort_values(["品名"])
        return df

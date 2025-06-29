from logging import getLogger

import pandas as pd
from domain.glissue_csv import GlissueCsv

logger = getLogger(__name__)


class GlissueCsvRepo:
    def __init__(self, filepath: str) -> None:
        self.filepath = filepath

    def read(self) -> GlissueCsv:
        df = pd.read_csv(self.filepath)
        glissue_csv = GlissueCsv(df)

        return self.__filter(glissue_csv)

    def __filter(self, glissue_csv: GlissueCsv) -> GlissueCsv:
        df = glissue_csv.raw()
        drops = []
        for index, row in df.iterrows():
            # かんばんステータス
            if row["kanban_status"] == "--テンプレート":
                logger.info(f"一覧から除外しました。テンプレートタスクです。 - URL: {row["web_url"]}, タイトル: {row["title"]}")
                drops.append(index)
                continue

        # 不要な行を削除
        glissue_csv.raw_csv = df.drop(drops)
        return glissue_csv

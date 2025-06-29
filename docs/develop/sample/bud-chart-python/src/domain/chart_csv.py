import datetime
import math
from datetime import datetime as dt
from decimal import ROUND_CEILING, Decimal
from logging import getLogger
from typing import Any, Tuple

import jpholiday
import numpy as np
import pandas as pd

from domain.progress import Progress
from domain.schedule import Schedule

logger = getLogger(__name__)


class ChartCsv:
    aggs = pd.DataFrame()

    # deprecated: ChartCsvの新規作成はcreate関数を使ってください。
    def __init__(self, df: pd.DataFrame) -> None:
        self.aggs = df

    # データから再作成。repositoryだけで利用
    @classmethod
    def _reconstruct(cls, df: pd.DataFrame) -> Any:
        return cls(df)

    # repositoryだけで利用
    def _data_frame(self) -> pd.DataFrame:
        return self.aggs.copy()

    # 新規作成
    @classmethod
    def create(cls, schedule: Schedule, progress: Progress, start_date_str: str, end_date_str: str) -> Any:
        aggs = cls.__layout(start_date_str, end_date_str)

        # 累積ポイント
        aggs, schedule_cum = cls.__set_schedule_cumulative(aggs, schedule)
        aggs, progress_cum = cls.__set_progress_cumulative(aggs, progress)

        # 残りポイント
        total_point = schedule.total()
        aggs, schedule_rem = cls.__set_schedule_remining(aggs, total_point, start_date_str, end_date_str)
        aggs, progress_rem = cls.__set_progress_remining(aggs, total_point, progress)

        # 計算結果の確認
        cls.__check_result(schedule_cum, progress_cum, schedule_rem, progress_rem)
        return cls(aggs)

    @staticmethod
    def __layout(start_date_str: str, end_date_str: str) -> pd.DataFrame:
        # DataFrame
        #   index: 日付(指定期間)
        #   cols: 予定累積, 実績累積, 予定残り, 実績残り
        #   セル: 0.0
        return pd.DataFrame(
            np.nan,
            index=pd.date_range(start=start_date_str, end=end_date_str, freq="d").strftime("%Y-%m-%d"),
            columns=[
                "schedule_cumulative",
                "progress_cumulative",
                "schedule_remaining",
                "progress_remaining",
            ],
        )

    def latest_date(self) -> dt | None:
        # 初日の実績欄がNaNなら実績がないので、予定の初日=dfの1行目で早期リターン
        if pd.isna(self.aggs.iloc[0]["progress_cumulative"]):
            return self.aggs.index[0]

        # 実績の最終日を取って返す
        result = None
        for date, row in self.aggs.iterrows():
            if pd.isna(row["progress_cumulative"]):
                break
            result = date

        return result

    def elapsed_day_count(self) -> int:
        result = 0
        for cur_date, row in self.aggs.iterrows():
            # 実績がない日以降はカウントしない
            if pd.isna(row["progress_cumulative"]):
                break

            # 平日のみカウント
            if self.__is_bizday(dt.strftime(cur_date, "%Y-%m-%d")):
                result += 1
        return result

    def total_day_count(self) -> int:
        return self.__count_bizday(self.aggs.index[0], self.aggs.index[-1])

    def left_day_count(self) -> int:
        return self.total_day_count() - self.elapsed_day_count()

    def left_day_count_rate(self) -> int:
        total_day_count = self.total_day_count()
        elapsed_day_count = self.elapsed_day_count()

        result = math.floor((total_day_count - elapsed_day_count) / total_day_count * 100)

        return result

    def compreted_point(self) -> float:
        result = 0.0
        for _, row in self.aggs.iterrows():
            # 実績がない日以降はカウントしない
            if pd.isna(row["progress_cumulative"]):
                break

            result = row["progress_cumulative"]
        return result

    def schedule_point(self) -> float:
        # 予定累積 = Dataframe最終行のschedule_cumulative
        return float(self.aggs.iloc[-1]["schedule_cumulative"])

    def left_point(self) -> float:
        return self.schedule_point() - self.compreted_point()

    def left_point_rate(self) -> int:
        progress_point = self.compreted_point()
        schedule_point = self.schedule_point()

        result = math.floor((schedule_point - progress_point) / schedule_point * 100)

        return result

    @staticmethod
    def __set_schedule_cumulative(aggs: pd.DataFrame, schedule: Schedule) -> Tuple[pd.DataFrame, float]:
        # 予定累積
        schedule_cum = 0.0

        for cur_date, _ in aggs.iterrows():
            schedule_cum += schedule.scheduled_point(cur_date)
            aggs.at[cur_date, "schedule_cumulative"] = schedule_cum

        return aggs, schedule_cum

    @staticmethod
    def __set_progress_cumulative(aggs: pd.DataFrame, progress: Progress) -> Tuple[pd.DataFrame, float]:
        # 実績累積
        progress_cum = 0.0

        # 実績が空なら早期リターン
        if progress.is_empty():
            return aggs, progress_cum

        for cur_date, _ in aggs.iterrows():
            if cur_date > progress.latest_date():
                break

            progress_cum += progress.compreted_point(cur_date)
            aggs.at[cur_date, "progress_cumulative"] = progress_cum

        return aggs, progress_cum

    @classmethod
    def __set_schedule_remining(cls, aggs: pd.DataFrame, total_point: float, start_date_str: str, end_date_str: str) -> Tuple[pd.DataFrame, float]:
        # 平均消化ポイント
        avg = cls.__points_to_be_complated(total_point, start_date_str, end_date_str)
        # 予定残り
        schedule_rem = total_point

        for cur_date, _ in aggs.iterrows():
            # 営業日なら残数を減らす
            if cls.__is_bizday(cur_date):
                schedule_rem -= avg

            # 予定残りの下限は0
            if schedule_rem < 0:
                schedule_rem = 0
                logger.info(f"予定残りポイントが0を下回りました。 - 日付: {cur_date}")

            aggs.at[cur_date, "schedule_remaining"] = schedule_rem

        return aggs, schedule_rem

    @classmethod
    def __points_to_be_complated(cls, total: float, start_date_str: str, end_date_str: str) -> float:
        avg = total / cls.__count_bizday(start_date_str, end_date_str)
        # 0.5 ポイントに合わせて、小数点以下第1位に丸める
        return float(Decimal(avg).quantize(Decimal("0.1"), rounding=ROUND_CEILING))

    @classmethod
    def __count_bizday(cls, start_date_str: str, end_date_str: str) -> int:
        days = pd.DataFrame(
            0,
            index=pd.date_range(start=start_date_str, end=end_date_str, freq="d").strftime("%Y-%m-%d"),
            columns=["is_bizday"],
        )
        for cur_date, _ in days.iterrows():
            if cls.__is_bizday(cur_date):
                days.at[cur_date, "is_bizday"] = 1

        return days["is_bizday"].sum()

    @staticmethod
    def __is_bizday(date_str: str) -> bool:
        date = datetime.date(int(date_str[0:4]), int(date_str[5:7]), int(date_str[8:10]))
        # 平日 かつ 祝日ではない
        if date.weekday() < 5 and not jpholiday.is_holiday(date):
            return True
        return False

    @staticmethod
    def __set_progress_remining(aggs: pd.DataFrame, total_point: float, progress: Progress) -> Tuple[pd.DataFrame, float]:
        # 実績残り
        progress_rem = total_point

        # 実績が空なら早期リターン
        if progress.is_empty():
            return aggs, progress_rem

        for cur_date, _ in aggs.iterrows():
            if cur_date > progress.latest_date():
                break

            progress_rem -= progress.compreted_point(cur_date)
            aggs.at[cur_date, "progress_remaining"] = progress_rem

        return aggs, progress_rem

    @staticmethod
    def __check_result(schedule_cum: float, progress_cum: float, schedule_rem: float, progress_rem: float) -> None:
        # 予定残りが0になっていない場合はエラー
        if schedule_rem != 0:
            logger.error(f"予定残りが、`0`になっていません。予定残り: {schedule_rem} 想定: 0")

        # 実績残りが予定累計 - 実績累計でなければエラー
        if progress_rem != schedule_cum - progress_cum:
            logger.error(f"実績残りが、`予定累計 - 実績累計`になっていません。実績残り: {progress_rem}, 想定: {schedule_cum - progress_cum}")

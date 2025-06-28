from datetime import date

import pandas as pd


class Schedule:
    aggs = pd.DataFrame()

    def __init__(self, tasks: pd.DataFrame) -> None:
        # tasks: DataFrame
        #   cols:
        #     - created_on datetime.date
        #     - point float
        self.aggs = tasks.groupby("created_on").sum()

    def scheduled_point(self, target_date: date) -> float:
        value = 0.0
        if target_date in self.aggs.index:
            value = float(self.aggs.loc[target_date, "point"])
        return value

    def total(self) -> float:
        return float(self.aggs.sum()["point"])

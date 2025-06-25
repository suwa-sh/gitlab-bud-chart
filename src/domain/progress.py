from datetime import date

import pandas as pd


class Progress:
    aggs = pd.DataFrame()

    def __init__(self, tasks: pd.DataFrame) -> None:
        # tasks: DataFrame
        #   cols:
        #     - compreted_on datetime.date
        #     - point float
        self.aggs = tasks.groupby("compreted_on").sum()

    def compreted_point(self, target_date: date) -> float:
        value = 0.0
        if target_date in self.aggs.index:
            value = float(self.aggs.loc[target_date, "point"])
        return value

    def latest_date(self) -> date:
        return self.aggs.index[-1]

    def is_empty(self) -> bool:
        return len(self.aggs) == 0

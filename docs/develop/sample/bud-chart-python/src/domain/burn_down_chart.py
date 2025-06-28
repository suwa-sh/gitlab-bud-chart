import pandas as pd
from domain.chart_csv import ChartCsv


class BurnDownChart:
    chart_df = pd.DataFrame()

    def __init__(self, chart_csv: ChartCsv) -> None:
        df = chart_csv._data_frame()
        self.chart_df = df[["schedule_remaining", "progress_remaining"]]

    # repositoryだけで利用
    def _data_frame(self) -> pd.DataFrame:
        return self.chart_df.copy()

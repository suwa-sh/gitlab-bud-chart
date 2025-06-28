import pandas as pd
from domain.chart_csv import ChartCsv


class ChartCsvRepo:
    def __init__(self, dir: str) -> None:
        self.filepath = f"{dir}/burn-up-down.csv"

    def write(self, chart_csv: ChartCsv) -> None:
        df = chart_csv._data_frame()
        df.to_csv(self.filepath)

    def read(self) -> ChartCsv:
        df = pd.read_csv(self.filepath, index_col=0, parse_dates=True)
        return ChartCsv._reconstruct(df)

from domain.burn_down_chart import BurnDownChart
from domain.burn_up_chart import BurnUpChart

from usecase.repo.burn_down_chart_svg_repo import BurnDownChartSvgRepo
from usecase.repo.burn_up_chart_svg_repo import BurnUpChartSvgRepo
from usecase.repo.chart_csv_repo import ChartCsvRepo
from usecase.repo.chart_csv_summary_repo import ChartCsvSummaryRepo


class DrawChartUsecase:
    def __init__(self, dir: str) -> None:
        self.chart_csv_repo = ChartCsvRepo(dir)
        self.burn_up_chart_repo = BurnUpChartSvgRepo(dir)
        self.burn_down_chart_repo = BurnDownChartSvgRepo(dir)
        self.chart_csv_summary_repo = ChartCsvSummaryRepo(dir)

    def execute(self) -> None:
        chart_csv = self.chart_csv_repo.read()

        burn_up_chart = BurnUpChart(chart_csv)
        self.burn_up_chart_repo.write(burn_up_chart)

        burn_down_chart = BurnDownChart(chart_csv)
        self.burn_down_chart_repo.write(burn_down_chart)

        self.chart_csv_summary_repo.write(chart_csv)

import matplotlib.pyplot as plt
from domain.burn_up_chart import BurnUpChart
from usecase.repo.chart_utils import chart_settings, title_size


class BurnUpChartSvgRepo:
    def __init__(self, output_dir: str) -> None:
        self.filepath = f"{output_dir}/burn-up.svg"

    def write(self, burn_up_chart: BurnUpChart) -> None:
        df = burn_up_chart._data_frame()
        ax = chart_settings(df)

        ax.plot(df.index, df["schedule_cumulative"], lw=4, color="wheat", label="予定累積")
        ax.plot(df.index, df["progress_cumulative"], lw=4, color="orange", label="実績累積")
        plt.title("burn up", fontsize=title_size())
        plt.legend(loc="upper left")

        plt.savefig(self.filepath, format="svg")

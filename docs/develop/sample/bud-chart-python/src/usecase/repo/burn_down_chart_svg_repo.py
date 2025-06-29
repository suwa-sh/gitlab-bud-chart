import matplotlib.pyplot as plt
from domain.burn_down_chart import BurnDownChart
from usecase.repo.chart_utils import chart_settings, title_size


class BurnDownChartSvgRepo:
    def __init__(self, output_dir: str) -> None:
        self.filepath = f"{output_dir}/burn-down.svg"

    def write(self, burn_down_chart: BurnDownChart) -> None:
        df = burn_down_chart._data_frame()
        ax = chart_settings(df)

        ax.plot(df.index, df["schedule_remaining"], lw=4, color="lightgreen", label="予定残り")
        ax.plot(df.index, df["progress_remaining"], lw=4, color="green", label="実績残り")
        plt.title("burn down", fontsize=title_size())
        plt.legend(loc="upper right")

        plt.savefig(self.filepath, format="svg")

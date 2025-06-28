from domain.chart_csv import ChartCsv

class ChartCsvSummaryRepo:
    def __init__(self, output_dir: str) -> None:
        self.filepath = f"{output_dir}/summary.txt"

    def write(self, chart_csv: ChartCsv) -> None:
        # サマリ情報
        latest_date = chart_csv.latest_date()
        elapsed_day_count = chart_csv.elapsed_day_count()
        total_day_count = chart_csv.total_day_count()
        left_day_count = chart_csv.left_day_count()
        left_day_count_rate = chart_csv.left_day_count_rate()
        progress_point = chart_csv.compreted_point()
        schedule_point = chart_csv.schedule_point()
        left_point = chart_csv.left_point()
        left_point_rate = chart_csv.left_point_rate()

        latest_date_str = ""
        if latest_date is not None:
            latest_date_str = latest_date.strftime("%Y-%m-%d")

        # テキストの整形
        text = f"■{latest_date_str} 時点\n"
        text += "- 完了\n"
        text += f"  - {elapsed_day_count} / {total_day_count} 日目\n"
        text += f"  - {progress_point} / {schedule_point} ポイント\n"
        text += "- 残り\n"
        text += f"  - {left_day_count} / {total_day_count} 日: {left_day_count_rate}%\n"
        text += f"  - {left_point} / {schedule_point} ポイント: {left_point_rate}%\n"
        f = open(self.filepath, "w")
        f.write(text)
        f.close()

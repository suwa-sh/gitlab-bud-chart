import os

from domain.chart_csv import ChartCsv
from usecase.repo.chart_csv_repo import ChartCsvRepo
from usecase.repo.glissue_csv_repo import GlissueCsvRepo


class TransformGlissueUsecase:
    def __init__(self, input_file_path: str) -> None:
        self.glissue_repo = GlissueCsvRepo(input_file_path)

        output_dir = os.path.dirname(input_file_path)
        self.chart_repo = ChartCsvRepo(output_dir)

    def execute(self, start_date_str: str, end_date_str: str) -> None:
        glissue_csv = self.glissue_repo.read()

        glissue_csv.cleansing(start_date_str, end_date_str)
        schedule = glissue_csv.to_schedule()
        progess = glissue_csv.to_progress()

        chart_csv = ChartCsv.create(schedule, progess, start_date_str, end_date_str)
        self.chart_repo.write(chart_csv)

import os

from usecase.repo.glissue_csv_inspection_repo import GlissueCsvInspectionRepo
from usecase.repo.glissue_csv_repo import GlissueCsvRepo


class WriteInspectionCsvUsecase:
    def __init__(self, input_file_path: str, start_date_str: str, end_date_str: str) -> None:
        self.glissue_repo = GlissueCsvRepo(input_file_path)

        output_dir = os.path.dirname(input_file_path)
        self.inspection_repo = GlissueCsvInspectionRepo(output_dir, start_date_str, end_date_str)

    def execute(self) -> str:
        glissue_csv = self.glissue_repo.read()
        output_file_path = self.inspection_repo.write(glissue_csv)
        return output_file_path

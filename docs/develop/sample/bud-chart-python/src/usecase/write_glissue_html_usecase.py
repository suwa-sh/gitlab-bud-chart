import os

from usecase.repo.glissue_csv_html_repo import GlissueCsvHtmlRepo
from usecase.repo.glissue_csv_repo import GlissueCsvRepo


class WriteGlissueHtmlUsecase:
    def __init__(self, input_file_path: str) -> None:
        self.csv_repo = GlissueCsvRepo(input_file_path)

        output_dir = os.path.dirname(input_file_path)
        self.html_repo = GlissueCsvHtmlRepo(output_dir)

    def execute(self) -> None:
        glissue_csv = self.csv_repo.read()
        self.html_repo.write(glissue_csv)

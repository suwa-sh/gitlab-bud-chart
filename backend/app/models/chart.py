from pydantic import BaseModel
from datetime import date

class ChartDataResponse(BaseModel):
    date: date
    planned_points: float = 0.0
    actual_points: float = 0.0
    remaining_points: float = 0.0
    completed_points: float = 0.0
    completed_issues: int = 0
    total_issues: int = 0
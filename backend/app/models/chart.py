from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class ChartDataModel(BaseModel):
    date: date
    planned_points: float = 0.0
    actual_points: float = 0.0
    remaining_points: float = 0.0
    completed_points: float = 0.0
    total_points: float = 0.0
    completed_issues: int = 0
    total_issues: int = 0

class ChartDataResponse(BaseModel):
    date: date
    planned_points: float = 0.0
    actual_points: float = 0.0
    remaining_points: float = 0.0
    completed_points: float = 0.0
    completed_issues: int = 0
    total_issues: int = 0

class BurnChartRequest(BaseModel):
    milestone: Optional[str] = None
    start_date: date
    end_date: date
    chart_type: str  # 'burn_down' or 'burn_up'

class BurnChartResponse(BaseModel):
    chart_data: List[ChartDataModel]
    metadata: dict
    statistics: dict

class VelocityDataModel(BaseModel):
    week_start: date
    week_end: date
    completed_points: float
    completed_issues: int
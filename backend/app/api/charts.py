from fastapi import APIRouter
from typing import List
from app.models.chart import ChartDataResponse

router = APIRouter()

@router.get("/burn-down", response_model=List[ChartDataResponse])
async def get_burn_down_data(
    milestone: str,
    start_date: str,
    end_date: str
):
    """Burn-downチャートデータ取得"""
    # TODO: Task 10で実装
    return [
        {
            "date": "2024-01-01",
            "planned_points": 10.0,
            "actual_points": 0.0,
            "remaining_points": 10.0
        }
    ]

@router.get("/burn-up", response_model=List[ChartDataResponse])
async def get_burn_up_data(
    milestone: str,
    start_date: str,
    end_date: str
):
    """Burn-upチャートデータ取得"""
    # TODO: Task 10で実装
    return [
        {
            "date": "2024-01-01",
            "planned_points": 10.0,
            "actual_points": 0.0,
            "completed_points": 0.0
        }
    ]
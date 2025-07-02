from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional
from datetime import date
import logging
from app.services.session_manager import session_manager
from app.models.chart import BurnChartResponse, ChartDataModel

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/burn-down", response_model=BurnChartResponse)
async def get_burn_down_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None),
    x_session_id: Optional[str] = Header(None)
):
    """Burn-downチャートデータ取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    if start_date >= end_date:
        raise HTTPException(
            status_code=400,
            detail="終了日は開始日より後の日付を指定してください"
        )
    
    # issue_serviceとchart_analyzerをセッション用に作成
    from app.services.issue_service import IssueService
    from app.services.chart_analyzer import ChartAnalyzer
    issue_service = IssueService()
    issue_service.client = gitlab_client
    chart_analyzer = ChartAnalyzer()
    
    try:
        # Issue取得・分析
        issues, _ = await issue_service.get_analyzed_issues(
            milestone=milestone,
            analyze=True
        )
        
        # チャートデータ生成
        chart_data = chart_analyzer.generate_burn_down_data(
            issues, start_date, end_date, milestone
        )
        
        # メタデータ・統計情報
        metadata = {
            'total_issues': len(issues),
            'total_points': sum(i.point for i in issues if i.point),
            'milestone': milestone,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
        
        statistics = _calculate_chart_statistics(chart_data, 'burn_down')
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Burn-downチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/burn-up", response_model=BurnChartResponse)
async def get_burn_up_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None)
):
    """Burn-upチャートデータ取得"""
    if start_date >= end_date:
        raise HTTPException(
            status_code=400,
            detail="終了日は開始日より後の日付を指定してください"
        )
    
    try:
        issues, _ = await issue_service.get_analyzed_issues(
            milestone=milestone,
            analyze=True
        )
        
        chart_data = chart_analyzer.generate_burn_up_data(
            issues, start_date, end_date, milestone
        )
        
        metadata = {
            'total_issues': len(issues),
            'total_points': sum(i.point for i in issues if i.point),
            'milestone': milestone,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
        
        statistics = _calculate_chart_statistics(chart_data, 'burn_up')
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Burn-upチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/velocity")
async def get_velocity_data(weeks: int = Query(12, ge=1, le=52)):
    """ベロシティデータ取得"""
    try:
        issues, _ = await issue_service.get_analyzed_issues(analyze=True)
        velocity_data = chart_analyzer.generate_velocity_data(issues, weeks)
        
        return {
            'velocity_data': velocity_data,
            'average_velocity': sum(v['completed_points'] for v in velocity_data) / len(velocity_data) if len(velocity_data) > 0 else 0,
            'weeks_analyzed': len(velocity_data)
        }
        
    except Exception as e:
        logger.error(f"ベロシティAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _calculate_chart_statistics(chart_data: List[ChartDataModel], chart_type: str) -> dict:
    """チャート統計計算"""
    if not chart_data:
        return {}
    
    final_data = chart_data[-1]
    initial_data = chart_data[0]
    
    if chart_type == 'burn_down':
        return {
            'completion_rate': (initial_data.actual_points - final_data.actual_points) / initial_data.actual_points if initial_data.actual_points > 0 else 0,
            'final_remaining_points': final_data.remaining_points,
            'days_analyzed': len(chart_data)
        }
    else:  # burn_up
        return {
            'completion_rate': final_data.completed_points / final_data.total_points if final_data.total_points > 0 else 0,
            'final_completed_points': final_data.completed_points,
            'days_analyzed': len(chart_data)
        }
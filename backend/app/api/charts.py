from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional
from datetime import date
import logging
from app.services.session_manager import session_manager
from app.models.chart import BurnChartResponse, ChartDataModel
from app.utils.issue_filters import apply_unified_filters, apply_scope_filters
from app.utils.shared_filters import apply_advanced_filters, sort_issues

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/burn-down", response_model=BurnChartResponse)
async def get_burn_down_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    kanban_status: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    is_epic: Optional[str] = Query(None),
    point_min: Optional[float] = Query(None),
    point_max: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    created_after: Optional[date] = Query(None),
    created_before: Optional[date] = Query(None),
    completed_after: Optional[date] = Query(None),
    completed_before: Optional[date] = Query(None),
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
        # Issue取得・分析（全状態で取得）
        issues, _ = await issue_service.get_analyzed_issues(
            state='all',  # チャートでは全状態のイシューを取得
            analyze=True
        )
        
        # 統一されたフィルタリングパイプライン
        # 1. 日付補正適用
        issues = apply_unified_filters(issues, start_date)
        
        # 2. スコープフィルタ適用（期間が指定されている場合）
        warnings = []
        issues, warnings = apply_scope_filters(issues, start_date, end_date)
        
        # 3. 追加フィルタ適用（共通関数を使用）
        issues = apply_advanced_filters(
            issues,
            min_point=point_min,
            max_point=point_max,
            search=search,
            kanban_status=kanban_status,
            is_epic=is_epic,
            state=state,
            created_after=created_after,
            created_before=created_before,
            completed_after=completed_after,
            completed_before=completed_before,
            assignee=assignee,
            service=service,
            milestone=milestone
        )
        
        # チャートデータ生成（事前フィルタリング済みのissuesを渡す）
        chart_data = chart_analyzer.generate_burn_down_data(
            issues, start_date, end_date
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
        
        # 警告情報をレスポンス形式に変換
        formatted_warnings = []
        for warning in warnings:
            formatted_warnings.append({
                'issue': {
                    'id': warning['issue'].id,
                    'iid': warning['issue'].iid,
                    'title': warning['issue'].title,
                    'web_url': warning['issue'].web_url,
                    'kanban_status': warning['issue'].kanban_status,
                    'due_date': warning['issue'].due_date.isoformat() if warning['issue'].due_date else None,
                    'completed_at': warning['issue'].completed_at.isoformat() if warning['issue'].completed_at else None,
                    'created_at': warning['issue'].created_at.isoformat() if warning['issue'].created_at else None
                },
                'reason': warning['reason']
            })
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics,
            warnings=formatted_warnings
        )
        
    except Exception as e:
        logger.error(f"Burn-downチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/burn-up", response_model=BurnChartResponse)
async def get_burn_up_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    kanban_status: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    is_epic: Optional[str] = Query(None),
    point_min: Optional[float] = Query(None),
    point_max: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    created_after: Optional[date] = Query(None),
    created_before: Optional[date] = Query(None),
    completed_after: Optional[date] = Query(None),
    completed_before: Optional[date] = Query(None),
    x_session_id: Optional[str] = Header(None)
):
    """Burn-upチャートデータ取得"""
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
        # Issue取得・分析（全状態で取得）
        issues, _ = await issue_service.get_analyzed_issues(
            state='all',  # チャートでは全状態のイシューを取得
            analyze=True
        )
        
        # 統一されたフィルタリングパイプライン
        # 1. 日付補正適用
        issues = apply_unified_filters(issues, start_date)
        
        # 2. スコープフィルタ適用（期間が指定されている場合）
        warnings = []
        issues, warnings = apply_scope_filters(issues, start_date, end_date)
        
        # 3. 追加フィルタ適用（共通関数を使用）
        issues = apply_advanced_filters(
            issues,
            min_point=point_min,
            max_point=point_max,
            search=search,
            kanban_status=kanban_status,
            is_epic=is_epic,
            state=state,
            created_after=created_after,
            created_before=created_before,
            completed_after=completed_after,
            completed_before=completed_before,
            assignee=assignee,
            service=service,
            milestone=milestone
        )
        
        # チャートデータ生成（事前フィルタリング済みのissuesを渡す）
        chart_data = chart_analyzer.generate_burn_up_data(
            issues, start_date, end_date
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
        
        # 警告情報をレスポンス形式に変換
        formatted_warnings = []
        for warning in warnings:
            formatted_warnings.append({
                'issue': {
                    'id': warning['issue'].id,
                    'iid': warning['issue'].iid,
                    'title': warning['issue'].title,
                    'web_url': warning['issue'].web_url,
                    'kanban_status': warning['issue'].kanban_status,
                    'due_date': warning['issue'].due_date.isoformat() if warning['issue'].due_date else None,
                    'completed_at': warning['issue'].completed_at.isoformat() if warning['issue'].completed_at else None,
                    'created_at': warning['issue'].created_at.isoformat() if warning['issue'].created_at else None
                },
                'reason': warning['reason']
            })
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics,
            warnings=formatted_warnings
        )
        
    except Exception as e:
        logger.error(f"Burn-upチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/velocity")
async def get_velocity_data(
    weeks: int = Query(12, ge=1, le=52),
    x_session_id: Optional[str] = Header(None)
):
    """ベロシティデータ取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceとchart_analyzerをセッション用に作成
    from app.services.issue_service import IssueService
    from app.services.chart_analyzer import ChartAnalyzer
    issue_service = IssueService()
    issue_service.client = gitlab_client
    chart_analyzer = ChartAnalyzer()
    
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
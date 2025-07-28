from fastapi import APIRouter, HTTPException, Query, Header
from typing import List, Optional, Dict, Any
from datetime import date
from app.services.session_manager import session_manager
from app.models.issue import (
    IssueResponse, 
    IssueListRequest, 
    IssueListResponse,
    IssueSearchRequest,
    IssueModel
)
from app.utils.issue_filters import apply_unified_filters
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def _apply_scope_filter(
    issues: List[IssueModel],
    chart_start_date: Optional[date],
    chart_end_date: Optional[date]
) -> List[IssueModel]:
    """チャートと同様のスコープフィルタを適用"""
    if not chart_start_date or not chart_end_date:
        return issues
    
    filtered = []
    for issue in issues:
        # created_atが表示期間終了日より未来の場合は除外
        if issue.created_at.date() > chart_end_date:
            continue
        
        # Case 1: created_atが期間内
        if chart_start_date <= issue.created_at.date() <= chart_end_date:
            filtered.append(issue)
            continue
        
        # Case 2: created_atが範囲外でもOpenedなら対象（ただし期間内作成のみ）
        if issue.state == 'opened':
            filtered.append(issue)
            continue
        
        # Case 3: completed_atが期間内なら対象（ただし期間内作成のみ）
        if (issue.completed_at and 
            chart_start_date <= issue.completed_at.date() <= chart_end_date):
            filtered.append(issue)
            continue
    
    return filtered

def _apply_advanced_filters(
    issues: List[IssueModel], 
    min_point: Optional[float], 
    max_point: Optional[float], 
    search: Optional[str],
    kanban_status: Optional[str],
    is_epic: Optional[str]
) -> List[IssueModel]:
    """高度フィルタ適用（統一フィルタは事前適用済み）"""
    filtered = issues
    
    # Point範囲フィルタ
    if min_point is not None:
        filtered = [i for i in filtered if i.point is not None and i.point >= min_point]
    if max_point is not None:
        filtered = [i for i in filtered if i.point is not None and i.point <= max_point]
    
    # テキスト検索
    if search:
        search_lower = search.lower()
        filtered = [
            i for i in filtered 
            if search_lower in i.title.lower() or search_lower in i.description.lower()
        ]
    
    # Kanbanステータスフィルタ（追加）
    if kanban_status:
        filtered = [i for i in filtered if i.kanban_status == kanban_status]
    
    # Epicフィルタ
    if is_epic:
        original_count = len(filtered)
        if is_epic == 'epic':
            # is_epic が True の場合のみ
            filtered = [i for i in filtered if i.is_epic is True]
        elif is_epic == 'normal':
            # is_epic が False または None の場合
            filtered = [i for i in filtered if i.is_epic is not True]
    
    return filtered

def _sort_issues(issues: List[IssueModel], sort_by: str, sort_order: str) -> List[IssueModel]:
    """Issue ソート"""
    reverse = sort_order == 'desc'
    
    if sort_by == 'created_at':
        return sorted(issues, key=lambda x: x.created_at, reverse=reverse)
    elif sort_by == 'updated_at':
        return sorted(issues, key=lambda x: x.updated_at or x.created_at, reverse=reverse)
    elif sort_by == 'point':
        return sorted(issues, key=lambda x: x.point or 0, reverse=reverse)
    elif sort_by == 'title':
        return sorted(issues, key=lambda x: x.title.lower(), reverse=reverse)
    elif sort_by == 'state':
        return sorted(issues, key=lambda x: x.state, reverse=reverse)
    else:
        return sorted(issues, key=lambda x: x.created_at, reverse=reverse)

def _paginate_issues(issues: List[IssueModel], page: int, per_page: int) -> List[IssueModel]:
    """ページネーション"""
    start = (page - 1) * per_page
    end = start + per_page
    return issues[start:end]

def _collect_metadata(issues: List[IssueModel]) -> Dict[str, Any]:
    """メタデータ収集"""
    return {
        'milestones': sorted(list(set(i.milestone for i in issues if i.milestone))),
        'assignees': sorted(list(set(i.assignee for i in issues if i.assignee))),
        'services': sorted(list(set(i.service for i in issues if i.service))),
        'quarters': sorted(list(set(i.quarter for i in issues if i.quarter))),
        'kanban_statuses': sorted(list(set(i.kanban_status for i in issues if i.kanban_status)))
    }

def _issue_to_response(issue: IssueModel) -> IssueResponse:
    """IssueModel → IssueResponse変換"""
    return IssueResponse(
        id=issue.id,
        iid=issue.iid,
        title=issue.title,
        description=issue.description,
        state=issue.state,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        due_date=issue.due_date,
        assignee=issue.assignee,
        milestone=issue.milestone,
        labels=issue.labels,
        web_url=issue.web_url,
        point=issue.point,
        kanban_status=issue.kanban_status,
        service=issue.service,
        quarter=issue.quarter,
        completed_at=issue.completed_at,
        is_epic=issue.is_epic
    )

@router.get("/", response_model=Dict[str, Any])
async def get_issues(
    x_session_id: Optional[str] = Header(None),
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    kanban_status: Optional[str] = Query(None),
    min_point: Optional[float] = Query(None),
    max_point: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    is_epic: Optional[str] = Query(None),
    chart_start_date: Optional[date] = Query(None),
    chart_end_date: Optional[date] = Query(None),
    sort_by: Optional[str] = Query('created_at'),
    sort_order: Optional[str] = Query('desc'),
    page: Optional[int] = Query(1),
    per_page: Optional[int] = Query(50)
):
    """高度なフィルタ・検索対応Issues一覧取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceとissue_analyzerをセッション用に作成
    from app.services.issue_service import IssueService
    from app.services.issue_analyzer import IssueAnalyzer
    issue_service = IssueService()
    issue_service.client = gitlab_client
    issue_analyzer = IssueAnalyzer()
    
    try:
        # パラメータ正規化
        normalized_state = state if state and state.strip() else 'all'
        normalized_milestone = milestone if milestone and milestone.strip() else None
        normalized_assignee = assignee if assignee and assignee.strip() else None
        normalized_service = service if service and service.strip() else None
        normalized_quarter = quarter if quarter and quarter.strip() else None
        normalized_kanban_status = kanban_status if kanban_status and kanban_status.strip() else None
        normalized_search = search if search and search.strip() else None
        normalized_is_epic = is_epic if is_epic and is_epic.strip() else None
        
        # フィルタ条件構築
        labels = []
        if normalized_service:
            labels.append(f"s:{normalized_service}")
        if normalized_quarter:
            labels.append(f"@{normalized_quarter}")
        if normalized_kanban_status:
            labels.append(f"#{normalized_kanban_status}")
        
        # Issue取得・分析（全状態で取得）
        issues, statistics = await issue_service.get_analyzed_issues(
            state='all',  # チャートと同様に全状態で取得
            milestone=normalized_milestone,
            assignee=normalized_assignee,
            labels=labels if labels else None,
            analyze=True
        )
        
        # まず統一フィルタを適用（除外ルールと日付補正）
        issues = apply_unified_filters(issues)
        
        # スコープフィルタ適用（チャートと同条件）
        if chart_start_date and chart_end_date:
            issues = _apply_scope_filter(issues, chart_start_date, chart_end_date)
        
        # stateフィルタを後から適用
        if normalized_state and normalized_state != 'all':
            issues = [i for i in issues if i.state == normalized_state]
        
        # 追加フィルタ適用
        filtered_issues = _apply_advanced_filters(
            issues, min_point, max_point, normalized_search, normalized_kanban_status, normalized_is_epic
        )
        
        
        # ソート
        sorted_issues = _sort_issues(filtered_issues, sort_by, sort_order)
        
        # ページネーション
        paginated_issues = _paginate_issues(sorted_issues, page, per_page)
        
        # メタデータ収集
        metadata = _collect_metadata(filtered_issues)
        
        return {
            'issues': [_issue_to_response(issue) for issue in paginated_issues],
            'total_count': len(filtered_issues),
            'page': page,
            'per_page': per_page,
            'total_pages': (len(filtered_issues) + per_page - 1) // per_page,
            'metadata': metadata,
            'statistics': statistics
        }
        
    except Exception as e:
        logger.error(f"Issues一覧取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyzed", response_model=Dict[str, Any])
async def get_analyzed_issues(
    x_session_id: Optional[str] = Header(None),
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    labels: Optional[str] = Query(None),
    include_statistics: bool = Query(True, description="統計情報を含めるか")
):
    """分析済みissue一覧取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        label_list = labels.split(',') if labels else None
        
        # 分析済みissue取得
        issues, statistics = await issue_service.get_analyzed_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=label_list,
            analyze=True
        )
        
        # レスポンス構築
        issue_responses = [
            IssueResponse(
                id=issue.id,
                iid=issue.iid,
                title=issue.title,
                description=issue.description,
                state=issue.state,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                due_date=issue.due_date,
                assignee=issue.assignee,
                milestone=issue.milestone,
                labels=issue.labels,
                web_url=issue.web_url,
                point=issue.point,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter,
                completed_at=issue.completed_at,
                is_epic=issue.is_epic
            )
            for issue in issues
        ]
        
        response = {
            'issues': issue_responses,
            'total_count': len(issue_responses)
        }
        
        if include_statistics:
            response['statistics'] = statistics
        
        return response
        
    except Exception as e:
        logger.error(f"分析済みIssues取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"分析済みIssues取得に失敗しました: {str(e)}")

@router.get("/validation", response_model=Dict[str, Any])
async def validate_issues_data(
    x_session_id: Optional[str] = Header(None)
):
    """Issue分析データ検証"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceとissue_analyzerをセッション用に作成
    from app.services.issue_service import IssueService
    from app.services.issue_analyzer import IssueAnalyzer
    issue_service = IssueService()
    issue_service.client = gitlab_client
    issue_analyzer = IssueAnalyzer()
    
    try:
        # 全issue取得・分析
        issues = await issue_service.get_all_issues()
        analyzed_issues = issue_analyzer.analyze_issues_batch(issues)
        
        # 検証実行
        validation_results = []
        for issue in analyzed_issues:
            validation = issue_analyzer.validate_issue_data(issue)
            if validation['warnings'] or validation['errors']:
                validation_results.append({
                    'issue_id': issue.id,
                    'issue_title': issue.title,
                    'warnings': validation['warnings'],
                    'errors': validation['errors']
                })
        
        # 検証サマリー
        total_issues = len(analyzed_issues)
        issues_with_warnings = len([r for r in validation_results if r['warnings']])
        issues_with_errors = len([r for r in validation_results if r['errors']])
        
        return {
            'validation_results': validation_results,
            'summary': {
                'total_issues': total_issues,
                'issues_with_warnings': issues_with_warnings,
                'issues_with_errors': issues_with_errors,
                'validation_rate': round((total_issues - issues_with_errors) / total_issues, 4) if total_issues > 0 else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Issue検証API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issue検証に失敗しました: {str(e)}")

@router.get("/statistics", response_model=Dict[str, Any])
async def get_issues_statistics(
    x_session_id: Optional[str] = Header(None),
    milestone: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    service: Optional[str] = Query(None)
):
    """Issue統計情報取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        # フィルタ条件構築
        labels = []
        if quarter:
            labels.append(f"@{quarter}")
        if service:
            labels.append(f"s:{service}")
        
        # 分析済みissue取得
        issues, base_statistics = await issue_service.get_analyzed_issues(
            milestone=milestone,
            labels=labels if labels else None,
            analyze=True
        )
        
        # 詳細統計追加
        detailed_statistics = {
            **base_statistics,
            'milestone_breakdown': {},
            'quarter_breakdown': {},
            'service_breakdown': {},
            'point_distribution': {}
        }
        
        # マイルストーン別分析
        milestones = set(issue.milestone for issue in issues if issue.milestone)
        for ms in milestones:
            ms_issues = [i for i in issues if i.milestone == ms]
            detailed_statistics['milestone_breakdown'][ms] = {
                'count': len(ms_issues),
                'total_points': sum(i.point for i in ms_issues if i.point),
                'completed_count': len([i for i in ms_issues if i.completed_at])
            }
        
        # Quarter別分析
        quarters = set(issue.quarter for issue in issues if issue.quarter)
        for q in quarters:
            q_issues = [i for i in issues if i.quarter == q]
            detailed_statistics['quarter_breakdown'][q] = {
                'count': len(q_issues),
                'total_points': sum(i.point for i in q_issues if i.point)
            }
        
        # Service別分析
        services = set(issue.service for issue in issues if issue.service)
        for s in services:
            s_issues = [i for i in issues if i.service == s]
            detailed_statistics['service_breakdown'][s] = {
                'count': len(s_issues),
                'total_points': sum(i.point for i in s_issues if i.point)
            }
        
        # Point分布
        points = [issue.point for issue in issues if issue.point]
        if points:
            detailed_statistics['point_distribution'] = {
                'min': min(points),
                'max': max(points),
                'median': sorted(points)[len(points)//2],
                'distribution': {str(p): points.count(p) for p in set(points)}
            }
        
        return detailed_statistics
        
    except Exception as e:
        logger.error(f"Issue統計API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issue統計取得に失敗しました: {str(e)}")

@router.post("/search", response_model=Dict[str, Any])
async def search_issues(
    search_request: IssueSearchRequest,
    x_session_id: Optional[str] = Header(None),
    chart_start_date: Optional[date] = Query(None),
    chart_end_date: Optional[date] = Query(None)
):
    """高度検索API"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        # 検索条件をクエリパラメータ形式に変換
        labels = []
        if search_request.service:
            labels.append(f"s:{search_request.service}")
        if search_request.quarter:
            labels.append(f"@{search_request.quarter}")
        if search_request.kanban_status:
            labels.append(f"#{search_request.kanban_status}")
        
        # Issue取得・分析（全状態で取得）
        issues, statistics = await issue_service.get_analyzed_issues(
            state='all',  # チャートと同様に全状態で取得
            milestone=search_request.milestone,
            assignee=search_request.assignee,
            labels=labels if labels else None,
            analyze=True
        )
        
        # まず統一フィルタを適用（除外ルールと日付補正）
        issues = apply_unified_filters(issues)
        
        # スコープフィルタ適用（チャートと同条件）
        if chart_start_date and chart_end_date:
            issues = _apply_scope_filter(issues, chart_start_date, chart_end_date)
        
        # stateフィルタを後から適用
        if search_request.state and search_request.state != 'all':
            issues = [i for i in issues if i.state == search_request.state]
        
        # 日付範囲フィルタ
        if search_request.date_from or search_request.date_to:
            filtered_issues = []
            for issue in issues:
                issue_date = issue.created_at
                if search_request.date_from and issue_date < search_request.date_from:
                    continue
                if search_request.date_to and issue_date > search_request.date_to:
                    continue
                filtered_issues.append(issue)
            issues = filtered_issues
        
        # 追加フィルタ適用
        filtered_issues = _apply_advanced_filters(
            issues, search_request.min_point, search_request.max_point,
            search_request.query, search_request.kanban_status, search_request.is_epic
        )
        
        # ソート
        sorted_issues = _sort_issues(
            filtered_issues, search_request.sort_by, search_request.sort_order
        )
        
        # ページネーション
        paginated_issues = _paginate_issues(
            sorted_issues, search_request.page, search_request.per_page
        )
        
        # メタデータ収集
        metadata = _collect_metadata(filtered_issues)
        
        return {
            'issues': [_issue_to_response(issue) for issue in paginated_issues],
            'total_count': len(filtered_issues),
            'page': search_request.page,
            'per_page': search_request.per_page,
            'total_pages': (len(filtered_issues) + search_request.per_page - 1) // search_request.per_page,
            'metadata': metadata,
            'search_criteria': search_request.dict()
        }
        
    except Exception as e:
        logger.error(f"高度検索API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"高度検索に失敗しました: {str(e)}")

@router.get("/export/csv")
async def export_issues_csv(
    x_session_id: Optional[str] = Header(None),
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None)
):
    """Issues CSV エクスポート"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        import csv
        import io
        from fastapi.responses import StreamingResponse
        
        # フィルタ条件構築
        labels = []
        if service:
            labels.append(f"s:{service}")
        if quarter:
            labels.append(f"@{quarter}")
        
        # Issue取得・分析
        issues, _ = await issue_service.get_analyzed_issues(
            state=state,
            milestone=milestone,
            labels=labels if labels else None,
            analyze=True
        )
        
        # CSV作成
        output = io.StringIO()
        writer = csv.writer(output)
        
        # ヘッダー
        writer.writerow([
            'ID', 'Title', 'State', 'Created At', 'Updated At', 'Due Date',
            'Assignee', 'Milestone', 'Epic', 'Point', 'Kanban Status', 'Service',
            'Quarter', 'Completed At', 'Web URL'
        ])
        
        # データ行
        for issue in issues:
            writer.writerow([
                issue.id,
                issue.title,
                issue.state,
                issue.created_at.isoformat() if issue.created_at else '',
                issue.updated_at.isoformat() if issue.updated_at else '',
                issue.due_date.isoformat() if issue.due_date else '',
                issue.assignee or '',
                issue.milestone or '',
                'Epic' if issue.is_epic else '',
                issue.point or '',
                issue.kanban_status or '',
                issue.service or '',
                issue.quarter or '',
                issue.completed_at.isoformat() if issue.completed_at else '',
                issue.web_url or ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename="issues.csv"'}
        )
        
    except Exception as e:
        logger.error(f"CSV エクスポートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=f"CSV エクスポートに失敗しました: {str(e)}")

@router.get("/milestone/{milestone_name}", response_model=IssueListResponse)
async def get_issues_by_milestone(
    milestone_name: str,
    x_session_id: Optional[str] = Header(None)
):
    """マイルストーン別issue取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        issues = await issue_service.get_issues_by_milestone(milestone_name)
        
        issue_responses = [
            IssueResponse(
                id=issue.id,
                iid=issue.iid,
                title=issue.title,
                description=issue.description,
                state=issue.state,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                due_date=issue.due_date,
                assignee=issue.assignee,
                milestone=issue.milestone,
                labels=issue.labels,
                web_url=issue.web_url,
                point=issue.point,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter,
                completed_at=issue.completed_at,
                is_epic=issue.is_epic
            )
            for issue in issues
        ]
        
        return IssueListResponse(
            total_count=len(issue_responses),
            issues=issue_responses,
            milestones=[milestone_name],
            assignees=list(set(issue.assignee for issue in issues if issue.assignee))
        )
        
    except Exception as e:
        logger.error(f"マイルストーン別Issues取得API失敗 ({milestone_name}): {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"マイルストーン別Issues取得に失敗しました: {str(e)}"
        )

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: int,
    x_session_id: Optional[str] = Header(None)
):
    """特定issue詳細取得"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    # issue_serviceをセッション用に作成
    from app.services.issue_service import IssueService
    issue_service = IssueService()
    issue_service.client = gitlab_client
    
    try:
        issue = await issue_service.get_issue_by_id(issue_id)
        
        if not issue:
            raise HTTPException(status_code=404, detail=f"Issue not found: {issue_id}")
        
        return IssueResponse(
            id=issue.id,
            iid=issue.iid,
            title=issue.title,
            description=issue.description,
            state=issue.state,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            due_date=issue.due_date,
            assignee=issue.assignee,
            milestone=issue.milestone,
            labels=issue.labels,
            web_url=issue.web_url,
            point=issue.point,
            kanban_status=issue.kanban_status,
            service=issue.service,
            quarter=issue.quarter,
            completed_at=issue.completed_at,
            is_epic=issue.is_epic
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Issue詳細取得API失敗 (ID: {issue_id}): {e}")
        raise HTTPException(status_code=500, detail=f"Issue詳細取得に失敗しました: {str(e)}")
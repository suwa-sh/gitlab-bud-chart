from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.services.issue_service import issue_service
from app.services.issue_analyzer import issue_analyzer
from app.models.issue import (
    IssueResponse, 
    IssueListRequest, 
    IssueListResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=IssueListResponse)
async def get_issues(
    state: Optional[str] = Query('all', description="Issue状態 (all, opened, closed)"),
    milestone: Optional[str] = Query(None, description="マイルストーン名"),
    assignee: Optional[str] = Query(None, description="担当者名"),
    labels: Optional[str] = Query(None, description="ラベル (カンマ区切り)")
):
    """GitLabからissue一覧を取得"""
    try:
        # ラベル解析
        label_list = labels.split(',') if labels else None
        
        # Issue取得
        issues = await issue_service.get_all_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=label_list
        )
        
        # メタデータ抽出
        milestones = list(set(issue.milestone for issue in issues if issue.milestone))
        assignees = list(set(issue.assignee for issue in issues if issue.assignee))
        
        # レスポンス変換
        issue_responses = [
            IssueResponse(
                id=issue.id,
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
                completed_at=issue.completed_at
            )
            for issue in issues
        ]
        
        return IssueListResponse(
            total_count=len(issue_responses),
            issues=issue_responses,
            milestones=sorted(milestones),
            assignees=sorted(assignees)
        )
        
    except Exception as e:
        logger.error(f"Issues取得API失敗: {e}")
        raise HTTPException(status_code=500, detail=f"Issues取得に失敗しました: {str(e)}")

@router.get("/analyzed", response_model=Dict[str, Any])
async def get_analyzed_issues(
    state: Optional[str] = Query('all'),
    milestone: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    labels: Optional[str] = Query(None),
    include_statistics: bool = Query(True, description="統計情報を含めるか")
):
    """分析済みissue一覧取得"""
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
                completed_at=issue.completed_at
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
async def validate_issues_data():
    """Issue分析データ検証"""
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
    milestone: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    service: Optional[str] = Query(None)
):
    """Issue統計情報取得"""
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

@router.get("/milestone/{milestone_name}", response_model=IssueListResponse)
async def get_issues_by_milestone(milestone_name: str):
    """マイルストーン別issue取得"""
    try:
        issues = await issue_service.get_issues_by_milestone(milestone_name)
        
        issue_responses = [
            IssueResponse(
                id=issue.id,
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
                completed_at=issue.completed_at
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
async def get_issue(issue_id: int):
    """特定issue詳細取得"""
    try:
        issue = await issue_service.get_issue_by_id(issue_id)
        
        if not issue:
            raise HTTPException(status_code=404, detail=f"Issue not found: {issue_id}")
        
        return IssueResponse(
            id=issue.id,
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
            completed_at=issue.completed_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Issue詳細取得API失敗 (ID: {issue_id}): {e}")
        raise HTTPException(status_code=500, detail=f"Issue詳細取得に失敗しました: {str(e)}")
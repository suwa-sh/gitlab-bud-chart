from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.issue_service import issue_service
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
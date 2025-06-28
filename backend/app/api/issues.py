from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.issue import IssueResponse

router = APIRouter()

@router.get("/", response_model=List[IssueResponse])
async def get_issues(
    milestone: Optional[str] = None,
    assignee: Optional[str] = None,
    state: Optional[str] = None
):
    """GitLabからissue一覧を取得"""
    # TODO: Task 04で実装
    return [
        {
            "id": 1,
            "title": "Sample Issue",
            "state": "opened",
            "created_at": "2024-01-01T00:00:00Z",
            "assignee": "user1",
            "milestone": "v1.0",
            "labels": ["p:1.0", "#作業中", "s:backend"],
            "point": 1.0,
            "kanban_status": "作業中",
            "service": "backend"
        }
    ]

@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: int):
    """特定issue詳細取得"""
    # TODO: Task 04で実装
    return {
        "id": issue_id,
        "title": f"Issue {issue_id}",
        "state": "opened",
        "created_at": "2024-01-01T00:00:00Z",
        "assignee": "user1",
        "milestone": "v1.0",
        "labels": ["p:1.0"],
        "point": 1.0
    }
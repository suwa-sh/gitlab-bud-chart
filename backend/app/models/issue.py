from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class IssueModel(BaseModel):
    id: int
    iid: int
    title: str
    description: str
    state: str  # opened, closed
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    web_url: Optional[str] = None
    
    # 分析用フィールド（Task 05で実装）
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None
    is_epic: Optional[bool] = None

class IssueResponse(BaseModel):
    """API レスポンス用"""
    id: int
    iid: int
    title: str
    description: str
    state: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    web_url: Optional[str] = None
    
    # 分析済みフィールド
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None
    is_epic: Optional[bool] = None

class IssueListRequest(BaseModel):
    """Issue一覧取得リクエスト"""
    state: Optional[str] = 'all'
    milestone: Optional[str] = None
    assignee: Optional[str] = None
    labels: Optional[List[str]] = None
    per_page: Optional[int] = 100

class IssueListResponse(BaseModel):
    """Issue一覧取得レスポンス"""
    total_count: int
    issues: List[IssueResponse]
    milestones: List[str]
    assignees: List[str]

class IssueSearchRequest(BaseModel):
    """高度検索リクエスト"""
    query: Optional[str] = None
    state: Optional[str] = 'all'
    milestone: Optional[str] = None
    assignee: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    kanban_status: Optional[str] = None
    min_point: Optional[float] = None
    max_point: Optional[float] = None
    is_epic: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: Optional[str] = 'created_at'
    sort_order: Optional[str] = 'desc'
    page: Optional[int] = 1
    per_page: Optional[int] = 50


class ExcludedIssue(BaseModel):
    """除外されたIssue情報"""
    issue: IssueResponse
    reason: str  # 'quarter', 'pre-period', 'post-period', 'template', 'unnecessary', 'goal', 'no-due-date'


class IssueListWithWarningsResponse(BaseModel):
    """警告情報を含むIssue一覧レスポンス"""
    issues: List[IssueResponse]
    warnings: List[ExcludedIssue]
    total_count: int
    filtered_count: int
    warning_count: int
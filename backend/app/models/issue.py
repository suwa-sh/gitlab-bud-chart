from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IssueModel(BaseModel):
    id: int
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

class IssueResponse(BaseModel):
    """API レスポンス用"""
    id: int
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
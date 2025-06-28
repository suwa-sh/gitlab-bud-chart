from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IssueResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    state: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assignee: Optional[str] = None
    milestone: Optional[str] = None
    labels: List[str] = []
    
    # 分析済みフィールド
    point: Optional[float] = None
    kanban_status: Optional[str] = None
    service: Optional[str] = None
    quarter: Optional[str] = None
    completed_at: Optional[datetime] = None
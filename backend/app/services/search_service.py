from typing import List, Optional, Dict, Any
from datetime import datetime, date, timezone
import re
from app.models.issue import IssueModel
import logging

logger = logging.getLogger(__name__)

class SearchService:
    """Issue検索・フィルタリングサービス"""
    
    def search_issues(
        self,
        issues: List[IssueModel],
        search_query: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[IssueModel]:
        """複合検索実行"""
        try:
            # テキスト検索
            if search_query:
                issues = self._text_search(issues, search_query)
            
            # フィルタ適用
            if filters:
                issues = self._apply_filters(issues, filters)
            
            return issues
            
        except Exception as e:
            logger.error(f"検索処理失敗: {e}")
            raise
    
    def _text_search(self, issues: List[IssueModel], query: str) -> List[IssueModel]:
        """テキスト検索（タイトル・説明）"""
        query_lower = query.lower()
        
        return [
            issue for issue in issues
            if (query_lower in issue.title.lower() or 
                (issue.description and query_lower in issue.description.lower()))
        ]
    
    def _apply_filters(
        self, 
        issues: List[IssueModel], 
        filters: Dict[str, Any]
    ) -> List[IssueModel]:
        """フィルタ適用"""
        
        # State フィルタ
        if filters.get('state'):
            issues = [i for i in issues if i.state == filters['state']]
        
        # Milestone フィルタ
        if filters.get('milestone'):
            issues = [i for i in issues if i.milestone == filters['milestone']]
        
        # Assignee フィルタ
        if filters.get('assignee'):
            issues = [i for i in issues if i.assignee == filters['assignee']]
        
        # Kanban Status フィルタ
        if filters.get('kanban_status'):
            issues = [i for i in issues if i.kanban_status == filters['kanban_status']]
        
        # Service フィルタ
        if filters.get('service'):
            issues = [i for i in issues if i.service == filters['service']]
        
        # Quarter フィルタ
        if filters.get('quarter'):
            issues = [i for i in issues if i.quarter == filters['quarter']]
        
        # Point範囲フィルタ
        if filters.get('min_point') is not None:
            issues = [i for i in issues if i.point and i.point >= filters['min_point']]
        if filters.get('max_point') is not None:
            issues = [i for i in issues if i.point and i.point <= filters['max_point']]
        
        # 日付範囲フィルタ
        if filters.get('created_after'):
            created_after = self._parse_date(filters['created_after'])
            issues = [
                i for i in issues 
                if (i.created_at.astimezone(timezone.utc).date() if i.created_at.tzinfo else i.created_at.date()) >= created_after
            ]
        
        if filters.get('created_before'):
            created_before = self._parse_date(filters['created_before'])
            issues = [
                i for i in issues 
                if (i.created_at.astimezone(timezone.utc).date() if i.created_at.tzinfo else i.created_at.date()) <= created_before
            ]
        
        # 完了日フィルタ
        if filters.get('completed_after'):
            completed_after = self._parse_date(filters['completed_after'])
            issues = [
                i for i in issues 
                if i.completed_at and (i.completed_at.astimezone(timezone.utc).date() if i.completed_at.tzinfo else i.completed_at.date()) >= completed_after
            ]
        
        return issues
    
    def _parse_date(self, date_str: str) -> date:
        """日付文字列パース"""
        try:
            return datetime.fromisoformat(date_str).date()
        except:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
    
    def sort_issues(
        self,
        issues: List[IssueModel],
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> List[IssueModel]:
        """Issue並び替え"""
        reverse = (sort_order == 'desc')
        
        # ソートキー定義
        sort_keys = {
            'created_at': lambda x: x.created_at or datetime.min,
            'updated_at': lambda x: x.updated_at or datetime.min,
            'completed_at': lambda x: x.completed_at or datetime.min,
            'due_date': lambda x: x.due_date or datetime.min,
            'title': lambda x: x.title.lower(),
            'point': lambda x: x.point or 0,
            'state': lambda x: x.state,
            'milestone': lambda x: x.milestone or '',
            'assignee': lambda x: x.assignee or ''
        }
        
        if sort_by in sort_keys:
            return sorted(issues, key=sort_keys[sort_by], reverse=reverse)
        
        return issues

# グローバルインスタンス
search_service = SearchService()
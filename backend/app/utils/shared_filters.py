from typing import List, Optional
from datetime import datetime, timezone, date
from app.models.issue import IssueModel
import logging

logger = logging.getLogger(__name__)


def apply_advanced_filters(
    issues: List[IssueModel],
    min_point: Optional[float] = None,
    max_point: Optional[float] = None,
    search: Optional[str] = None,
    kanban_status: Optional[str] = None,
    is_epic: Optional[str] = None,
    state: Optional[str] = None,
    created_after: Optional[date] = None,
    created_before: Optional[date] = None,
    completed_after: Optional[date] = None,
    completed_before: Optional[date] = None,
    assignee: Optional[str] = None,
    service: Optional[str] = None,
    milestone: Optional[str] = None
) -> List[IssueModel]:
    """
    共通の高度フィルタ適用関数
    Issues API、Chart APIの両方で使用される
    
    Args:
        issues: フィルタ対象のIssue一覧
        min_point: 最小ポイント
        max_point: 最大ポイント
        search: タイトル・説明文検索
        kanban_status: かんばんステータス
        is_epic: Epic フィルタ ('epic', 'normal', None)
        state: Issue状態 ('opened', 'closed', 'all', None)
        created_after: 作成日以降フィルタ
        created_before: 作成日以前フィルタ
        completed_after: 完了日以降フィルタ
        completed_before: 完了日以前フィルタ
        assignee: アサイニー
        service: サービス
        milestone: マイルストーン
        
    Returns:
        フィルタリング済みIssue一覧
    """
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
            if search_lower in i.title.lower() or 
               (i.description and search_lower in i.description.lower())
        ]
    
    # Kanbanステータスフィルタ
    if kanban_status:
        filtered = [i for i in filtered if i.kanban_status == kanban_status]
    
    # Epicフィルタ
    if is_epic:
        if is_epic == 'epic':
            # is_epic が True の場合のみ
            filtered = [i for i in filtered if i.is_epic is True]
        elif is_epic == 'normal':
            # is_epic が False または None の場合
            filtered = [i for i in filtered if i.is_epic is not True]
    
    # 状態フィルタ
    if state and state != 'all':
        filtered = [i for i in filtered if i.state == state]
    
    # 作成日フィルタ
    if created_after or created_before:
        date_filtered = []
        for issue in filtered:
            if not issue.created_at:
                continue
                
            # timezone-awareなdatetimeから、UTCのdateを取得
            issue_date = issue.created_at.astimezone(timezone.utc).date() if issue.created_at.tzinfo else issue.created_at.date()
            
            if created_after and issue_date < created_after:
                continue
            if created_before and issue_date > created_before:
                continue
                
            date_filtered.append(issue)
        filtered = date_filtered
    
    # 完了日フィルタ
    if completed_after or completed_before:
        date_filtered = []
        for issue in filtered:
            if not issue.completed_at:
                # completed_atがNoneの場合、completed_afterが指定されていれば除外
                if completed_after:
                    continue
                # completed_beforeが指定されていれば含める（未完了は完了日前と見なす）
                date_filtered.append(issue)
                continue
                
            # timezone-awareなdatetimeから、UTCのdateを取得
            issue_date = issue.completed_at.astimezone(timezone.utc).date() if issue.completed_at.tzinfo else issue.completed_at.date()
            
            if completed_after and issue_date < completed_after:
                continue
            if completed_before and issue_date > completed_before:
                continue
                
            date_filtered.append(issue)
        filtered = date_filtered
    
    # アサイニーフィルタ
    if assignee:
        filtered = [i for i in filtered if i.assignee == assignee]
    
    # サービスフィルタ
    if service:
        filtered = [i for i in filtered if i.service == service]
    
    # マイルストーンフィルタ
    if milestone:
        filtered = [i for i in filtered if i.milestone == milestone]
    
    return filtered


def sort_issues(issues: List[IssueModel], sort_by: str, sort_order: str) -> List[IssueModel]:
    """
    共通のIssueソート関数
    
    Args:
        issues: ソート対象のIssue一覧
        sort_by: ソートキー ('created_at', 'updated_at', 'point', 'title', 'state')
        sort_order: ソート順序 ('asc', 'desc')
        
    Returns:
        ソート済みIssue一覧
    """
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
    elif sort_by == 'completed_at':
        return sorted(issues, key=lambda x: x.completed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=reverse)
    else:
        # デフォルトは作成日順
        return sorted(issues, key=lambda x: x.created_at, reverse=reverse)


def paginate_issues(issues: List[IssueModel], page: int, per_page: int) -> List[IssueModel]:
    """
    共通のページネーション関数
    
    Args:
        issues: ページネーション対象のIssue一覧
        page: ページ番号（1から開始）
        per_page: 1ページあたりの件数
        
    Returns:
        ページネーション済みIssue一覧
    """
    start = (page - 1) * per_page
    end = start + per_page
    return issues[start:end]
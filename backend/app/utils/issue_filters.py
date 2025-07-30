from typing import List, Dict, Any, Tuple
from datetime import timezone, datetime, date
import logging
from app.models.issue import IssueModel
from app.utils.quarter_utils import get_overlapping_quarters, normalize_quarter_label

logger = logging.getLogger(__name__)

# Unified exclusion rules for issues (without # prefix as they are converted during kanban_status processing)
EXCLUDED_KANBAN_STATUSES = [
    "テンプレート",
    "ゴール/アナウンス", 
    "不要"
]

def apply_exclusion_filter(issues: List[IssueModel]) -> List[IssueModel]:
    """Apply unified exclusion rules to filter out template and non-relevant issues"""
    return [
        issue for issue in issues 
        if issue.kanban_status not in EXCLUDED_KANBAN_STATUSES
    ]

def apply_date_correction(issue: IssueModel, start_date=None) -> IssueModel:
    """Apply date corrections:
    1. If created_at > completed_at, set created_at = completed_at
    2. If created_at < start_date, set created_at = start_date
    """
    corrected_issue = issue
    need_copy = False
    
    if issue.completed_at and issue.created_at:
        try:
            # Ensure both datetimes are timezone-aware for comparison
            created_at = issue.created_at
            completed_at = issue.completed_at
            
            # Make both timezone-aware if needed
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if completed_at.tzinfo is None:
                completed_at = completed_at.replace(tzinfo=timezone.utc)
            
            if created_at > completed_at:
                logger.warning(f"Issue {issue.iid}: correcting created_at from {created_at} to {completed_at}")
                if not need_copy:
                    corrected_issue = issue.model_copy()
                    need_copy = True
                corrected_issue.created_at = issue.completed_at
        except Exception:
            # If any error occurs during comparison, continue with other checks
            pass
    
    # Check if created_at < start_date
    if start_date and issue.created_at:
        try:
            from datetime import datetime
            # Convert start_date (date) to datetime for comparison
            if hasattr(start_date, 'replace'):  # It's a date object
                start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:  # It's already a datetime
                start_datetime = start_date
                if start_datetime.tzinfo is None:
                    start_datetime = start_datetime.replace(tzinfo=timezone.utc)
            
            created_at = issue.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            
            if created_at < start_datetime:
                logger.warning(f"Issue {issue.iid}: correcting created_at from {created_at} to {start_datetime}")
                if not need_copy:
                    corrected_issue = issue.model_copy()
                    need_copy = True
                corrected_issue.created_at = start_datetime
        except Exception:
            # If any error occurs during comparison, just return the issue as is
            pass
    
    return corrected_issue

def apply_unified_filters(issues: List[IssueModel], start_date=None) -> List[IssueModel]:
    """Apply all unified filtering rules including exclusions and date corrections"""
    # First apply exclusion filter
    filtered_issues = apply_exclusion_filter(issues)
    
    # Then apply date correction to each issue
    corrected_issues = [apply_date_correction(issue, start_date) for issue in filtered_issues]
    
    return corrected_issues


def apply_scope_filters(
    issues: List[IssueModel], 
    start_date: date, 
    end_date: date
) -> Tuple[List[IssueModel], List[Dict[str, Any]]]:
    """
    統合スコープフィルタ（バックエンド版）
    
    処理順序:
    1. 四半期フィルタ
    2. 統一フィルタ（テンプレート等除外）
    3. 日付補正
    4. スコープ判定（期間前後完了除外）
    5. Due date未設定の完了Issue検出（警告用）
    
    Returns:
        Tuple[List[IssueModel], List[Dict[str, Any]]]: (フィルタ済みIssue, 警告情報リスト)
    """
    warnings = []
    
    # 1. 四半期フィルタ
    target_quarters = get_overlapping_quarters(start_date, end_date)
    normalized_target_quarters = [normalize_quarter_label(q) for q in target_quarters]
    
    quarter_filtered = []
    for issue in issues:
        normalized_issue_quarter = normalize_quarter_label(issue.quarter or '')
        if not normalized_issue_quarter or normalized_issue_quarter not in normalized_target_quarters:
            warnings.append({
                'issue': issue,
                'reason': 'quarter'
            })
        else:
            quarter_filtered.append(issue)
    
    # 2. 統一フィルタ（テンプレート等除外）
    exclusion_filtered = []
    for issue in quarter_filtered:
        if issue.kanban_status in EXCLUDED_KANBAN_STATUSES:
            reason_map = {
                'テンプレート': 'template',
                'ゴール/アナウンス': 'goal',
                '不要': 'unnecessary'
            }
            warnings.append({
                'issue': issue,
                'reason': reason_map.get(issue.kanban_status, 'excluded')
            })
        else:
            exclusion_filtered.append(issue)
    
    # 3. 日付補正
    corrected_issues = [apply_date_correction(issue, start_date) for issue in exclusion_filtered]
    
    # 4. スコープ判定（期間前後完了除外、created_at > end_date除外）
    scope_filtered = []
    for issue in corrected_issues:
        # created_at > end_dateの場合は警告除外
        if issue.created_at:
            # datetimeとdateの比較のために変換
            if isinstance(end_date, date) and not isinstance(end_date, datetime):
                end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            else:
                end_datetime = end_date
            
            # タイムゾーンを統一
            created_at = issue.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            
            # created_at > end_dateの場合は警告除外
            if created_at > end_datetime:
                warnings.append({
                    'issue': issue,
                    'reason': 'created-after-period'
                })
                continue
        
        if issue.completed_at:
            # datetimeとdateの比較のために変換
            if isinstance(start_date, date) and not isinstance(start_date, datetime):
                start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                start_datetime = start_date
                
            if isinstance(end_date, date) and not isinstance(end_date, datetime):
                end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            else:
                end_datetime = end_date
            
            # タイムゾーンを統一
            completed_at = issue.completed_at
            if completed_at.tzinfo is None:
                completed_at = completed_at.replace(tzinfo=timezone.utc)
            
            # 期間後完了チェック
            if completed_at > end_datetime:
                warnings.append({
                    'issue': issue,
                    'reason': 'post-period'
                })
                continue
            # 期間前完了チェック
            elif completed_at < start_datetime:
                warnings.append({
                    'issue': issue,
                    'reason': 'pre-period'
                })
                continue
        
        scope_filtered.append(issue)
    
    # 5. Due date未設定の完了Issue検出（警告用）
    final_filtered = []
    for issue in scope_filtered:
        if issue.kanban_status in ['完了', '共有待ち'] and not issue.due_date:
            warnings.append({
                'issue': issue,
                'reason': 'no-due-date'
            })
        else:
            final_filtered.append(issue)
    
    return final_filtered, warnings
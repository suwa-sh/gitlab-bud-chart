from typing import List
from datetime import timezone
from app.models.issue import IssueModel

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
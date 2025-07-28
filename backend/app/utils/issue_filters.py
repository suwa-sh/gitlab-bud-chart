from typing import List
from datetime import timezone
from app.models.issue import IssueModel

# Unified exclusion rules for issues
EXCLUDED_KANBAN_STATUSES = [
    "#テンプレート",
    "#ゴール/アナウンス",
    "#不要"
]

def apply_exclusion_filter(issues: List[IssueModel]) -> List[IssueModel]:
    """Apply unified exclusion rules to filter out template and non-relevant issues"""
    return [
        issue for issue in issues 
        if issue.kanban_status not in EXCLUDED_KANBAN_STATUSES
    ]

def apply_date_correction(issue: IssueModel) -> IssueModel:
    """Apply date correction: if created_at > completed_at, set created_at = completed_at"""
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
                # Create a copy to avoid modifying the original
                corrected_issue = issue.model_copy()
                corrected_issue.created_at = issue.completed_at
                return corrected_issue
        except Exception:
            # If any error occurs during comparison, just return the original issue
            return issue
    return issue

def apply_unified_filters(issues: List[IssueModel]) -> List[IssueModel]:
    """Apply all unified filtering rules including exclusions and date corrections"""
    # First apply exclusion filter
    filtered_issues = apply_exclusion_filter(issues)
    
    # Then apply date correction to each issue
    corrected_issues = [apply_date_correction(issue) for issue in filtered_issues]
    
    return corrected_issues
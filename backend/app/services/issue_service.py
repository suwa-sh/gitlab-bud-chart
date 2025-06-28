from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from app.services.gitlab_client import gitlab_client
from app.models.issue import IssueModel, IssueResponse
from app.utils.retry import async_retry

logger = logging.getLogger(__name__)

class IssueService:
    def __init__(self):
        self.client = gitlab_client
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_all_issues(
        self,
        state: Optional[str] = 'all',
        milestone: Optional[str] = None,
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        per_page: int = 100
    ) -> List[IssueModel]:
        """全issue取得（ページネーション対応）"""
        if not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            all_issues = []
            page = 1
            
            while True:
                logger.info(f"Issues取得中... page: {page}")
                
                # パラメータ構築
                params = {
                    'state': state,
                    'per_page': per_page,
                    'page': page,
                    'order_by': 'created_at',
                    'sort': 'desc'
                }
                
                if milestone:
                    params['milestone'] = milestone
                if assignee:
                    params['assignee_username'] = assignee
                if labels:
                    params['labels'] = ','.join(labels)
                
                # API呼び出し
                issues_page = self.client.project.issues.list(**params)
                
                if not issues_page:
                    break
                
                # IssueModel変換
                for issue in issues_page:
                    issue_model = self._convert_to_model(issue)
                    all_issues.append(issue_model)
                
                # ページネーション制御
                if len(issues_page) < per_page:
                    break
                
                page += 1
                
                # 安全装置（最大1000件）
                if len(all_issues) >= 1000:
                    logger.warning("Issue取得数が1000件に達したため停止")
                    break
            
            logger.info(f"Issues取得完了: {len(all_issues)}件")
            return all_issues
            
        except Exception as e:
            logger.error(f"Issues取得失敗: {e}")
            raise
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_issue_by_id(self, issue_id: int) -> Optional[IssueModel]:
        """特定issue取得"""
        if not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            issue = self.client.project.issues.get(issue_id)
            return self._convert_to_model(issue)
        except Exception as e:
            logger.error(f"Issue取得失敗 (ID: {issue_id}): {e}")
            return None
    
    async def get_issues_by_milestone(
        self,
        milestone: str,
        state: str = 'all'
    ) -> List[IssueModel]:
        """マイルストーン別issue取得"""
        return await self.get_all_issues(
            state=state,
            milestone=milestone
        )
    
    def _convert_to_model(self, gitlab_issue) -> IssueModel:
        """GitLab Issue → IssueModel 変換"""
        try:
            return IssueModel(
                id=gitlab_issue.id,
                title=gitlab_issue.title,
                description=gitlab_issue.description or "",
                state=gitlab_issue.state,
                created_at=self._parse_datetime(gitlab_issue.created_at),
                updated_at=self._parse_datetime(gitlab_issue.updated_at),
                due_date=self._parse_datetime(gitlab_issue.due_date) if gitlab_issue.due_date else None,
                assignee=gitlab_issue.assignee['name'] if gitlab_issue.assignee else None,
                milestone=gitlab_issue.milestone['title'] if gitlab_issue.milestone else None,
                labels=gitlab_issue.labels or [],
                web_url=gitlab_issue.web_url
            )
        except Exception as e:
            logger.error(f"Issue変換失敗: {e}")
            raise
    
    def _parse_datetime(self, date_str: Optional[str]) -> Optional[datetime]:
        """日時文字列解析"""
        if not date_str:
            return None
        
        try:
            # GitLabの日時形式: "2024-01-01T00:00:00.000Z"
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.warning(f"日時解析失敗: {date_str}, error: {e}")
            return None

# グローバルインスタンス
issue_service = IssueService()
import gitlab
from typing import Optional, List, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class GitLabClient:
    def __init__(self):
        self.gl: Optional[gitlab.Gitlab] = None
        self.project = None
        
    def connect(self, gitlab_url: str, gitlab_token: str, project_id: str) -> bool:
        """GitLab接続"""
        try:
            self.gl = gitlab.Gitlab(gitlab_url, private_token=gitlab_token)
            self.gl.auth()
            self.project = self.gl.projects.get(project_id)
            logger.info(f"GitLab接続成功: {gitlab_url}, project: {project_id}")
            return True
        except Exception as e:
            logger.error(f"GitLab接続失敗: {e}")
            self.gl = None
            self.project = None
            return False
    
    def test_connection(self) -> Dict[str, Any]:
        """接続テスト"""
        if not self.gl or not self.project:
            return {
                "connected": False,
                "error": "GitLab接続が設定されていません"
            }
        
        try:
            # プロジェクト情報取得テスト
            project_info = {
                "id": self.project.id,
                "name": self.project.name,
                "description": self.project.description,
                "web_url": self.project.web_url,
                "issues_enabled": self.project.issues_enabled,
                "open_issues_count": getattr(self.project, 'open_issues_count', 0)
            }
            
            return {
                "connected": True,
                "project": project_info,
                "user": self.gl.user.name if self.gl.user else "Unknown"
            }
        except Exception as e:
            logger.error(f"GitLab接続テスト失敗: {e}")
            return {
                "connected": False,
                "error": str(e)
            }
    
    def get_issues_sample(self, limit: int = 5) -> List[Dict[str, Any]]:
        """サンプルissue取得（動作確認用）"""
        if not self.gl or not self.project:
            return []
        
        try:
            issues = self.project.issues.list(per_page=limit, state='all')
            return [
                {
                    "id": issue.id,
                    "title": issue.title,
                    "state": issue.state,
                    "created_at": issue.created_at,
                    "labels": issue.labels,
                    "assignee": issue.assignee['name'] if issue.assignee else None,
                    "milestone": issue.milestone['title'] if issue.milestone else None
                }
                for issue in issues
            ]
        except Exception as e:
            logger.error(f"Issues取得失敗: {e}")
            return []

# グローバルインスタンス
gitlab_client = GitLabClient()
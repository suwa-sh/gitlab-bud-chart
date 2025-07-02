import gitlab
from typing import Optional, List, Dict, Any
from app.config import settings
import logging
import os

logger = logging.getLogger(__name__)

class GitLabClient:
    def __init__(self):
        self.gl: Optional[gitlab.Gitlab] = None
        self.project = None
    
    @property
    def is_connected(self) -> bool:
        """GitLab接続状態を返す"""
        return self.gl is not None and self.project is not None
        
    def connect(self, gitlab_url: str, gitlab_token: str, project_identifier: str, api_version: str = "4", 
                http_proxy: str = "", https_proxy: str = "", no_proxy: str = "") -> bool:
        """GitLab接続（プロジェクトIDまたは名前で指定可能）"""
        try:
            # Proxy設定を環境変数に設定（パラメータ優先、次に設定ファイル）
            proxy_http = http_proxy or settings.http_proxy
            proxy_https = https_proxy or settings.https_proxy
            proxy_no = no_proxy or settings.no_proxy
            
            if proxy_http:
                os.environ['HTTP_PROXY'] = proxy_http
                os.environ['http_proxy'] = proxy_http
                logger.info(f"HTTP Proxy設定: {proxy_http}")
            if proxy_https:
                os.environ['HTTPS_PROXY'] = proxy_https
                os.environ['https_proxy'] = proxy_https
                logger.info(f"HTTPS Proxy設定: {proxy_https}")
            if proxy_no:
                os.environ['NO_PROXY'] = proxy_no
                os.environ['no_proxy'] = proxy_no
                logger.info(f"No Proxy設定: {proxy_no}")
            
            # API versionを明示的に指定し、SSL検証とタイムアウトを設定
            self.gl = gitlab.Gitlab(
                gitlab_url, 
                private_token=gitlab_token,
                api_version=api_version,
                ssl_verify=settings.gitlab_ssl_verify,
                timeout=30
            )
            
            # 認証テスト
            logger.info(f"GitLab認証開始: {gitlab_url}")
            self.gl.auth()
            logger.info(f"GitLab認証成功")
            
            # プロジェクト取得テスト
            logger.info(f"プロジェクト取得開始: project_identifier={project_identifier}")
            
            # プロジェクトIDが数値かどうかチェック
            if project_identifier.isdigit():
                # 数値の場合はIDとして扱う
                self.project = self.gl.projects.get(int(project_identifier))
                logger.info(f"GitLab接続成功: {gitlab_url}, project: {self.project.name} (id: {project_identifier})")
            else:
                # 数値でない場合は名前として検索
                project_info = self.get_project_by_name(gitlab_url, gitlab_token, project_identifier, api_version)
                if project_info:
                    self.project = self.gl.projects.get(project_info['id'])
                    logger.info(f"GitLab接続成功: {gitlab_url}, project: {self.project.name} (name: {project_identifier}, id: {project_info['id']})")
                else:
                    raise Exception(f"プロジェクトが見つかりません: {project_identifier}")
            
            return True
        except gitlab.exceptions.GitlabAuthenticationError as e:
            logger.error(f"GitLab認証失敗: {e}")
            self.gl = None
            self.project = None
            return False
        except gitlab.exceptions.GitlabGetError as e:
            logger.error(f"GitLabプロジェクト取得失敗: {e}")
            self.gl = None
            self.project = None
            return False
        except Exception as e:
            logger.error(f"GitLab接続失敗: {type(e).__name__}: {e}")
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
                "user": "Connected"
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
    
    def get_projects(self, gitlab_url: str, gitlab_token: str, api_version: str = "4",
                     http_proxy: str = "", https_proxy: str = "", no_proxy: str = "") -> List[Dict[str, Any]]:
        """ユーザーがアクセス可能なプロジェクト一覧を取得"""
        try:
            # Proxy設定を環境変数に設定（パラメータ優先、次に設定ファイル）
            proxy_http = http_proxy or settings.http_proxy
            proxy_https = https_proxy or settings.https_proxy
            proxy_no = no_proxy or settings.no_proxy
            
            if proxy_http:
                os.environ['HTTP_PROXY'] = proxy_http
                os.environ['http_proxy'] = proxy_http
            if proxy_https:
                os.environ['HTTPS_PROXY'] = proxy_https
                os.environ['https_proxy'] = proxy_https
            if proxy_no:
                os.environ['NO_PROXY'] = proxy_no
                os.environ['no_proxy'] = proxy_no
            
            # 一時的なGitLabクライアントを作成
            temp_gl = gitlab.Gitlab(
                gitlab_url,
                private_token=gitlab_token,
                api_version=api_version,
                ssl_verify=settings.gitlab_ssl_verify,
                timeout=30
            )
            
            # 認証テスト
            temp_gl.auth()
            
            # プロジェクト一覧取得（アクセス可能なもののみ）
            projects = temp_gl.projects.list(membership=True, all=True)
            
            return [
                {
                    "id": project.id,
                    "name": project.name,
                    "path": project.path,
                    "path_with_namespace": project.path_with_namespace,
                    "description": getattr(project, 'description', ''),
                    "web_url": project.web_url
                }
                for project in projects
            ]
        except gitlab.exceptions.GitlabAuthenticationError as e:
            logger.error(f"GitLab認証失敗: {e}")
            raise Exception("GitLab認証に失敗しました")
        except Exception as e:
            logger.error(f"プロジェクト一覧取得失敗: {e}")
            raise Exception(f"プロジェクト一覧の取得に失敗しました: {str(e)}")
    
    def get_project_by_name(self, gitlab_url: str, gitlab_token: str, project_name: str, api_version: str = "4") -> Optional[Dict[str, Any]]:
        """プロジェクト名からプロジェクト情報を取得"""
        try:
            projects = self.get_projects(gitlab_url, gitlab_token, api_version)
            
            # 名前で検索（完全一致優先、部分一致も考慮）
            exact_match = None
            partial_matches = []
            
            for project in projects:
                if project['name'] == project_name or project['path_with_namespace'] == project_name:
                    exact_match = project
                    break
                elif project_name.lower() in project['name'].lower() or project_name.lower() in project['path_with_namespace'].lower():
                    partial_matches.append(project)
            
            if exact_match:
                return exact_match
            elif len(partial_matches) == 1:
                return partial_matches[0]
            elif len(partial_matches) > 1:
                logger.warning(f"複数のプロジェクトが見つかりました: {project_name}")
                return partial_matches[0]  # 最初のものを返す
            else:
                logger.error(f"プロジェクトが見つかりません: {project_name}")
                return None
                
        except Exception as e:
            logger.error(f"プロジェクト名検索失敗: {e}")
            return None


# GitLabクライアントのシングルトンインスタンス
gitlab_client = GitLabClient()

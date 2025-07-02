from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.session_manager import session_manager
from typing import Dict, Any, Optional

router = APIRouter()

class GitLabConfigRequest(BaseModel):
    gitlab_url: str
    gitlab_token: str
    project_id: str
    api_version: str = "4"
    http_proxy: str = ""
    https_proxy: str = ""
    no_proxy: str = ""

class GitLabValidateRequest(BaseModel):
    gitlab_url: str
    gitlab_token: str
    api_version: str = "4"
    http_proxy: str = ""
    https_proxy: str = ""
    no_proxy: str = ""

class GitLabConfigResponse(BaseModel):
    success: bool
    message: str
    project_info: Dict[str, Any] = {}
    session_id: Optional[str] = None

@router.post("/connect", response_model=GitLabConfigResponse)
async def connect_gitlab(
    config: GitLabConfigRequest,
    x_session_id: Optional[str] = Header(None)
):
    """GitLab接続設定"""
    # セッションIDがない場合は新規作成
    if not x_session_id:
        session_id = session_manager.create_session()
    else:
        session_id = x_session_id
    
    # セッションに対応するGitLabClientを取得
    gitlab_client = session_manager.get_gitlab_client(session_id)
    if not gitlab_client:
        # セッションが存在しない場合は新規作成
        session_id = session_manager.create_session()
        gitlab_client = session_manager.get_gitlab_client(session_id)
    
    success = gitlab_client.connect(
        config.gitlab_url,
        config.gitlab_token,
        config.project_id,
        config.api_version,
        config.http_proxy,
        config.https_proxy,
        config.no_proxy
    )
    
    if success:
        test_result = gitlab_client.test_connection()
        if test_result["connected"]:
            return GitLabConfigResponse(
                success=True,
                message=f"GitLab接続成功: {test_result['project']['name']}",
                project_info=test_result,
                session_id=session_id
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"GitLab接続テスト失敗: {test_result.get('error', 'Unknown error')}"
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="GitLab接続に失敗しました"
        )

@router.get("/status")
async def get_gitlab_status(
    x_session_id: Optional[str] = Header(None)
):
    """GitLab接続状態確認"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    test_result = gitlab_client.test_connection()
    return test_result

@router.get("/issues/sample")
async def get_sample_issues(
    x_session_id: Optional[str] = Header(None)
):
    """サンプルissue取得（動作確認用）"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="セッションIDが必要です")
    
    gitlab_client = session_manager.get_gitlab_client(x_session_id)
    if not gitlab_client:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    
    issues = gitlab_client.get_issues_sample()
    return {
        "count": len(issues),
        "issues": issues
    }

@router.post("/validate")
async def validate_gitlab_credentials(
    config: GitLabValidateRequest,
    x_session_id: Optional[str] = Header(None)
):
    """GitLab URL とトークンの有効性を検証"""
    # セッションIDがない場合は一時的なGitLabClientを作成
    if x_session_id:
        gitlab_client = session_manager.get_gitlab_client(x_session_id)
        if not gitlab_client:
            from app.services.gitlab_client import GitLabClient
            gitlab_client = GitLabClient()
    else:
        from app.services.gitlab_client import GitLabClient
        gitlab_client = GitLabClient()
    
    try:
        # プロジェクト一覧取得で認証を確認
        projects = gitlab_client.get_projects(
            config.gitlab_url,
            config.gitlab_token,
            config.api_version,
            config.http_proxy,
            config.https_proxy,
            config.no_proxy
        )
        return {
            "valid": True,
            "message": "GitLab認証成功",
            "project_count": len(projects)
        }
    except Exception as e:
        return {
            "valid": False,
            "message": str(e)
        }

@router.post("/projects")
async def get_gitlab_projects(
    config: GitLabValidateRequest,
    x_session_id: Optional[str] = Header(None)
):
    """GitLab プロジェクト一覧取得"""
    # セッションIDがない場合は一時的なGitLabClientを作成
    if x_session_id:
        gitlab_client = session_manager.get_gitlab_client(x_session_id)
        if not gitlab_client:
            from app.services.gitlab_client import GitLabClient
            gitlab_client = GitLabClient()
    else:
        from app.services.gitlab_client import GitLabClient
        gitlab_client = GitLabClient()
    
    try:
        projects = gitlab_client.get_projects(
            config.gitlab_url,
            config.gitlab_token,
            config.api_version,
            config.http_proxy,
            config.https_proxy,
            config.no_proxy
        )
        return {
            "success": True,
            "projects": projects
        }
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
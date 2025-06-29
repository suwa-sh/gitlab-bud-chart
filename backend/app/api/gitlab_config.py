from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.gitlab_client import gitlab_client
from typing import Dict, Any

router = APIRouter()

class GitLabConfigRequest(BaseModel):
    gitlab_url: str
    gitlab_token: str
    project_id: str
    api_version: str = "4"

class GitLabValidateRequest(BaseModel):
    gitlab_url: str
    gitlab_token: str
    api_version: str = "4"

class GitLabConfigResponse(BaseModel):
    success: bool
    message: str
    project_info: Dict[str, Any] = {}

@router.post("/connect", response_model=GitLabConfigResponse)
async def connect_gitlab(config: GitLabConfigRequest):
    """GitLab接続設定"""
    success = gitlab_client.connect(
        config.gitlab_url,
        config.gitlab_token,
        config.project_id,
        config.api_version
    )
    
    if success:
        test_result = gitlab_client.test_connection()
        if test_result["connected"]:
            return GitLabConfigResponse(
                success=True,
                message=f"GitLab接続成功: {test_result['project']['name']}",
                project_info=test_result
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
async def get_gitlab_status():
    """GitLab接続状態確認"""
    test_result = gitlab_client.test_connection()
    return test_result

@router.get("/issues/sample")
async def get_sample_issues():
    """サンプルissue取得（動作確認用）"""
    issues = gitlab_client.get_issues_sample()
    return {
        "count": len(issues),
        "issues": issues
    }

@router.post("/validate")
async def validate_gitlab_credentials(config: GitLabValidateRequest):
    """GitLab URL とトークンの有効性を検証"""
    try:
        # プロジェクト一覧取得で認証を確認
        projects = gitlab_client.get_projects(
            config.gitlab_url,
            config.gitlab_token,
            config.api_version
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
async def get_gitlab_projects(config: GitLabValidateRequest):
    """GitLab プロジェクト一覧取得"""
    try:
        projects = gitlab_client.get_projects(
            config.gitlab_url,
            config.gitlab_token,
            config.api_version
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
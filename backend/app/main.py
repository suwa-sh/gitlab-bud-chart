from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import issues, charts, gitlab_config
from app.config import settings
from app.services.gitlab_client import gitlab_client
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="GitLab Bud Chart API",
    description="GitLab Issue Analysis and Chart Generation API",
    version="0.1.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3002"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター追加
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])
app.include_router(gitlab_config.router, prefix="/api/gitlab", tags=["gitlab"])

@app.get("/")
async def root():
    return {"message": "GitLab Bud Chart API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化"""
    logger.info("アプリケーション起動中...")
    
    # GitLab接続の自動初期化
    if settings.gitlab_url and settings.gitlab_token and settings.gitlab_project_id:
        logger.info("GitLab接続設定が見つかりました。接続を試行します...")
        success = gitlab_client.connect(
            settings.gitlab_url, 
            settings.gitlab_token, 
            settings.gitlab_project_id
        )
        if success:
            logger.info("GitLab接続成功")
        else:
            logger.warning("GitLab接続失敗 - 手動設定が必要です")
    else:
        logger.info("GitLab接続設定が不完全です。手動設定が必要です。")
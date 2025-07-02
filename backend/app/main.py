from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import issues, charts, gitlab_config
from app.config import settings
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="GitLab Bud Chart API",
    description="GitLab Issue Analysis and Chart Generation API",
    version="0.1.0"
)

# CORS設定
import os
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
    logger.info("マルチセッション管理モードで動作します。GitLab接続は各セッションで個別に設定してください。")
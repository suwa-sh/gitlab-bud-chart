from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import issues, charts
from app.config import settings

app = FastAPI(
    title="GitLab Bud Chart API",
    description="GitLab Issue Analysis and Chart Generation API",
    version="0.1.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター追加
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])

@app.get("/")
async def root():
    return {"message": "GitLab Bud Chart API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
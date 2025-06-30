from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # GitLab設定
    gitlab_url: Optional[str] = None
    gitlab_token: Optional[str] = None
    gitlab_project_id: Optional[str] = None
    
    # Proxy設定
    http_proxy: Optional[str] = None
    https_proxy: Optional[str] = None
    no_proxy: Optional[str] = None
    gitlab_ssl_verify: bool = True
    
    # API設定
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    class Config:
        env_file = ".env"

settings = Settings()
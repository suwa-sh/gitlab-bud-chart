import uuid
import time
import threading
import json
import os
from typing import Dict, Optional
from datetime import datetime, timedelta
from .gitlab_client import GitLabClient
import logging

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self, timeout_days: int = 7, persistence_file: str = "/tmp/sessions.json"):
        self.sessions: Dict[str, Dict] = {}
        self.timeout_days = timeout_days
        self.cleanup_interval = 3600  # 1時間ごとにクリーンアップ
        self.persistence_file = persistence_file
        self._load_sessions()
        self._start_cleanup_thread()
    
    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'gitlab_client': GitLabClient(),
            'created_at': datetime.now(),
            'last_accessed': datetime.now()
        }
        self._save_sessions()
        return session_id
    
    def get_gitlab_client(self, session_id: str) -> Optional[GitLabClient]:
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        session['last_accessed'] = datetime.now()
        self._save_sessions()
        return session['gitlab_client']
    
    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            self._save_sessions()
            return True
        return False
    
    def cleanup_expired_sessions(self):
        current_time = datetime.now()
        timeout_delta = timedelta(days=self.timeout_days)
        
        expired_sessions = []
        for session_id, session_data in self.sessions.items():
            if current_time - session_data['last_accessed'] > timeout_delta:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self.delete_session(session_id)
            logger.info(f"Session {session_id} expired and removed")
    
    def _cleanup_worker(self):
        while True:
            time.sleep(self.cleanup_interval)
            self.cleanup_expired_sessions()
    
    def _start_cleanup_thread(self):
        cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        cleanup_thread.start()
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return {
            'session_id': session_id,
            'created_at': session['created_at'].isoformat(),
            'last_accessed': session['last_accessed'].isoformat(),
            'is_connected': session['gitlab_client'].is_connected
        }

    def _save_sessions(self):
        """セッション情報をファイルに保存"""
        try:
            session_data = {}
            for session_id, session in self.sessions.items():
                gitlab_client = session['gitlab_client']
                session_data[session_id] = {
                    'created_at': session['created_at'].isoformat(),
                    'last_accessed': session['last_accessed'].isoformat(),
                    'gitlab_config': {
                        'url': getattr(gitlab_client, 'url', ''),
                        'token': getattr(gitlab_client, 'token', ''),
                        'project_id': getattr(gitlab_client, 'project_id', ''),
                        'api_version': getattr(gitlab_client, 'api_version', '4'),
                        'http_proxy': getattr(gitlab_client, 'http_proxy', ''),
                        'https_proxy': getattr(gitlab_client, 'https_proxy', ''),
                        'no_proxy': getattr(gitlab_client, 'no_proxy', ''),
                        'project_name': getattr(gitlab_client, 'project_name', ''),
                        'project_namespace': getattr(gitlab_client, 'project_namespace', ''),
                        'is_connected': gitlab_client.is_connected
                    }
                }
            
            with open(self.persistence_file, 'w') as f:
                json.dump(session_data, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to save sessions: {e}")

    def _load_sessions(self):
        """ファイルからセッション情報を復元"""
        try:
            if not os.path.exists(self.persistence_file):
                logger.info("Session persistence file not found, starting with empty sessions")
                return
                
            with open(self.persistence_file, 'r') as f:
                session_data = json.load(f)
                
            for session_id, data in session_data.items():
                # GitLabクライアントを復元
                gitlab_client = GitLabClient()
                config = data['gitlab_config']
                
                if config.get('url') and config.get('token') and config.get('project_id'):
                    # GitLabクライアントを再接続
                    success = gitlab_client.connect(
                        gitlab_url=config['url'],
                        gitlab_token=config['token'],
                        project_identifier=config['project_id'],
                        api_version=config.get('api_version', '4'),
                        http_proxy=config.get('http_proxy', ''),
                        https_proxy=config.get('https_proxy', ''),
                        no_proxy=config.get('no_proxy', '')
                    )
                    if not success:
                        logger.warning(f"Failed to restore GitLab connection for session {session_id}")
                
                # セッション復元
                self.sessions[session_id] = {
                    'gitlab_client': gitlab_client,
                    'created_at': datetime.fromisoformat(data['created_at']),
                    'last_accessed': datetime.fromisoformat(data['last_accessed'])
                }
                
            logger.info(f"Restored {len(self.sessions)} sessions from persistence file")
            
        except Exception as e:
            logger.warning(f"Failed to load sessions: {e}")
            self.sessions = {}

# グローバルインスタンス
session_manager = SessionManager()
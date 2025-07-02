import uuid
import time
import threading
from typing import Dict, Optional
from datetime import datetime, timedelta
from .gitlab_client import GitLabClient

class SessionManager:
    def __init__(self, timeout_days: int = 7):
        self.sessions: Dict[str, Dict] = {}
        self.timeout_days = timeout_days
        self.cleanup_interval = 3600  # 1時間ごとにクリーンアップ
        self._start_cleanup_thread()
    
    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'gitlab_client': GitLabClient(),
            'created_at': datetime.now(),
            'last_accessed': datetime.now()
        }
        return session_id
    
    def get_gitlab_client(self, session_id: str) -> Optional[GitLabClient]:
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        session['last_accessed'] = datetime.now()
        return session['gitlab_client']
    
    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
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
            print(f"Session {session_id} expired and removed")
    
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

# グローバルインスタンス
session_manager = SessionManager()
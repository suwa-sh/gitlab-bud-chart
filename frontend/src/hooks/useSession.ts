import { useState, useEffect } from 'react';

const SESSION_ID_KEY = 'gitlab-dashboard-session-id';

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // LocalStorageからセッションIDを取得
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  const saveSessionId = (newSessionId: string) => {
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    setSessionId(newSessionId);
  };

  const clearSessionId = () => {
    localStorage.removeItem(SESSION_ID_KEY);
    setSessionId(null);
  };

  const getSessionId = (): string | null => {
    return sessionId || localStorage.getItem(SESSION_ID_KEY);
  };

  return {
    sessionId,
    saveSessionId,
    clearSessionId,
    getSessionId,
  };
};
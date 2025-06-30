/**
 * 環境変数取得ユーティリティ
 * 実行時環境変数（window._env_）とビルド時環境変数（import.meta.env）の両方をサポート
 */

declare global {
  interface Window {
    _env_?: {
      VITE_API_URL?: string;
      VITE_GITLAB_URL?: string;
      VITE_GITLAB_TOKEN?: string;
      VITE_GITLAB_PROJECT_ID?: string;
      VITE_GITLAB_API_VERSION?: string;
      VITE_HTTP_PROXY?: string;
      VITE_HTTPS_PROXY?: string;
      VITE_NO_PROXY?: string;
    };
  }
}

/**
 * 環境変数を取得
 * 優先順位: window._env_ > import.meta.env > デフォルト値
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  // 実行時環境変数を優先
  if (typeof window !== 'undefined' && window._env_ && key in window._env_) {
    return (window._env_ as any)[key] || defaultValue;
  }
  
  // ビルド時環境変数にフォールバック
  if (import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  return defaultValue;
}

/**
 * API URLを取得
 * リバースプロキシ環境では相対パスを使用
 */
export function getApiUrl(): string {
  const envApiUrl = getEnv('VITE_API_URL');
  
  // 環境変数が設定されていない場合は相対パス（リバースプロキシ想定）
  if (!envApiUrl) {
    return '';
  }
  
  return envApiUrl;
}

/**
 * すべての環境変数を取得
 */
export function getAllEnv() {
  const buildTimeEnv = {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_GITLAB_URL: import.meta.env.VITE_GITLAB_URL,
    VITE_GITLAB_TOKEN: import.meta.env.VITE_GITLAB_TOKEN,
    VITE_GITLAB_PROJECT_ID: import.meta.env.VITE_GITLAB_PROJECT_ID,
    VITE_GITLAB_API_VERSION: import.meta.env.VITE_GITLAB_API_VERSION,
    VITE_HTTP_PROXY: import.meta.env.VITE_HTTP_PROXY,
    VITE_HTTPS_PROXY: import.meta.env.VITE_HTTPS_PROXY,
    VITE_NO_PROXY: import.meta.env.VITE_NO_PROXY,
  };
  
  const runtimeEnv = window._env_ || {};
  
  // 実行時環境変数を優先してマージ
  return {
    ...buildTimeEnv,
    ...runtimeEnv,
  };
}
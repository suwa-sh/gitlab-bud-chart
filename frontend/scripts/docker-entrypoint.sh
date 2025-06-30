#!/bin/sh

# エラーが発生したら停止
set -e

echo "Generating runtime environment configuration..."

# 環境変数をJavaScriptファイルに出力
cat > /app/dist/env-config.js <<EOF
window._env_ = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_GITLAB_URL: "${VITE_GITLAB_URL:-}",
  VITE_GITLAB_TOKEN: "${VITE_GITLAB_TOKEN:-}",
  VITE_GITLAB_PROJECT_ID: "${VITE_GITLAB_PROJECT_ID:-}",
  VITE_GITLAB_API_VERSION: "${VITE_GITLAB_API_VERSION:-4}",
  VITE_HTTP_PROXY: "${VITE_HTTP_PROXY:-}",
  VITE_HTTPS_PROXY: "${VITE_HTTPS_PROXY:-}",
  VITE_NO_PROXY: "${VITE_NO_PROXY:-}"
};
EOF

echo "Environment configuration generated at /app/dist/env-config.js"

# 元のコマンドを実行（npm run preview）
exec "$@"
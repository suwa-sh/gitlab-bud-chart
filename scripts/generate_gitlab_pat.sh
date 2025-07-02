#!/bin/bash

# --- 設定項目 ---
GITLAB_CONTAINER_NAME="gitlab"
TOKEN_NAME="Initial-Admin-Token"
# スコープの配列 (api, read_user, read_repository, etc.)
SCOPES="api"
# 有効期限（例: "365.days.from_now" や "nil" で無期限）
EXPIRES_AT="365.days.from_now"

# --- スクリプト本体 ---
echo "GitLabコンテナの起動を待機しています..."

# GitLabのヘルスチェックが 'healthy' になるまで待つ
while [[ "$(docker inspect -f {{.State.Health.Status}} ${GITLAB_CONTAINER_NAME})" != "healthy" ]]; do
    sleep 10
    echo -n "."
done
echo -e "\nGitLabが起動しました。"

echo "管理者(root)のPATを生成します..."

# Rubyスクリプトを生成
# スコープをRubyの配列形式に変換
ruby_scopes=$(echo "${SCOPES}" | sed "s/,/\", \"/g" | sed 's/^/["/' | sed 's/$/"]/')

# GitLabコンテナ内でRubyスクリプトを実行してトークンを生成
echo "トークンを生成中..."
GENERATED_TOKEN=$(docker exec "${GITLAB_CONTAINER_NAME}" gitlab-rails runner "
user = User.find_by_username('root')
token = user.personal_access_tokens.create(
  scopes: ${ruby_scopes},
  name: '${TOKEN_NAME}',
  expires_at: ${EXPIRES_AT}
)
puts token.token
")

# トークンが正常に生成されたかチェック
if [ -z "${GENERATED_TOKEN}" ] || [ "${GENERATED_TOKEN}" = "null" ]; then
    echo "❌ トークン生成に失敗しました"
    exit 1
fi

echo "✅ トークン生成成功"

# .envファイルを作成・更新
ROOT_DIR=$(cd "$(dirname "$0")/.." &> /dev/null && pwd)
ENV_FILE="${ROOT_DIR}/docker/.env"
ENV_EXAMPLE_FILE="${ROOT_DIR}/docker/.env.example"

if [ -f "${ENV_EXAMPLE_FILE}" ]; then
    cat "${ENV_EXAMPLE_FILE}" | sed "s#^VITE_GITLAB_TOKEN=.*#VITE_GITLAB_TOKEN=${GENERATED_TOKEN}#" > "${ENV_FILE}"
    echo "✅ .envファイルを更新しました: ${ENV_FILE}"
else
    echo "❌ .env.exampleファイルが見つかりません: ${ENV_EXAMPLE_FILE}"
    exit 1
fi
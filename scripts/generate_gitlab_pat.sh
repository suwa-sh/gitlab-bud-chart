#!/bin/bash

# --- GitLab PAT生成スクリプト ---
# 使用方法:
#   ./generate_gitlab_pat.sh                    # デフォルト設定で実行
#   ./generate_gitlab_pat.sh gitlab15           # コンテナ名を指定
#   ./generate_gitlab_pat.sh gitlab15 MyToken   # コンテナ名とトークン名を指定

# --- 設定項目 ---
# デフォルト値
DEFAULT_CONTAINER_NAME="gitlab"
DEFAULT_TOKEN_NAME="Initial-Admin-Token"
DEFAULT_SCOPES="api"
DEFAULT_EXPIRES_AT="365.days.from_now"

# コマンドライン引数の処理
GITLAB_CONTAINER_NAME="${1:-$DEFAULT_CONTAINER_NAME}"
TOKEN_NAME="${2:-$DEFAULT_TOKEN_NAME}"
SCOPES="${3:-$DEFAULT_SCOPES}"
EXPIRES_AT="${4:-$DEFAULT_EXPIRES_AT}"

echo "=== GitLab Personal Access Token 生成スクリプト ==="
echo "コンテナ名: ${GITLAB_CONTAINER_NAME}"
echo "トークン名: ${TOKEN_NAME}"
echo "スコープ: ${SCOPES}"
echo "有効期限: ${EXPIRES_AT}"
echo

# --- スクリプト本体 ---

# コンテナの存在確認
if ! docker ps -a --format "table {{.Names}}" | grep -q "^${GITLAB_CONTAINER_NAME}$"; then
    echo "❌ コンテナ '${GITLAB_CONTAINER_NAME}' が見つかりません"
    echo "利用可能なコンテナ一覧:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo "GitLabコンテナの起動を待機しています..."

# GitLabのヘルスチェックが 'healthy' になるまで待つ
while [[ "$(docker inspect -f {{.State.Health.Status}} ${GITLAB_CONTAINER_NAME})" != "healthy" ]]; do
    sleep 10
    echo -n "."
done
echo -e "\nGitLabが起動しました。"

# コンテナのポート情報を取得
echo "コンテナのポート情報を取得中..."
CONTAINER_PORT=$(docker port "${GITLAB_CONTAINER_NAME}" 80/tcp | cut -d':' -f2)

if [ -z "${CONTAINER_PORT}" ]; then
    echo "❌ コンテナのポート情報が取得できませんでした"
    echo "コンテナのポート情報:"
    docker port "${GITLAB_CONTAINER_NAME}"
    exit 1
fi

echo "✅ GitLabコンテナポート: ${CONTAINER_PORT}"
GITLAB_URL="http://localhost:${CONTAINER_PORT}"
echo "GitLab URL: ${GITLAB_URL}"

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

echo "=== .envファイルの更新 ==="

if [ -f "${ENV_EXAMPLE_FILE}" ]; then
    # .env.exampleを元に.envファイルを作成し、トークンとURLを更新
    cat "${ENV_EXAMPLE_FILE}" | \
        sed "s#^VITE_GITLAB_TOKEN=.*#VITE_GITLAB_TOKEN=${GENERATED_TOKEN}#" | \
        sed "s#^VITE_GITLAB_URL=.*#VITE_GITLAB_URL=${GITLAB_URL}#" > "${ENV_FILE}"
    
    echo "✅ .envファイルを更新しました: ${ENV_FILE}"
    echo "更新内容:"
    echo "  VITE_GITLAB_TOKEN=${GENERATED_TOKEN:0:8}..."
    echo "  VITE_GITLAB_URL=${GITLAB_URL}"
else
    echo "❌ .env.exampleファイルが見つかりません: ${ENV_EXAMPLE_FILE}"
    exit 1
fi

echo
echo "=== セットアップ完了 ==="
echo "GitLab URL: ${GITLAB_URL}"
echo "アクセストークン: ${GENERATED_TOKEN:0:8}...${GENERATED_TOKEN: -4}"
echo "コンテナ名: ${GITLAB_CONTAINER_NAME}"
echo
echo "次の手順:"
echo "1. ブラウザで ${GITLAB_URL} にアクセス"
echo "2. root / 初期パスワードでログイン"
echo "3. テストデータ生成: python3 scripts/generate_gitlab_test_data.py"
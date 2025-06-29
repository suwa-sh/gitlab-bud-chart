#!/bin/bash
set -e

echo "=== Phase 1 E2E テスト実行 ==="

# Backend起動
echo "Backend起動中..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Frontend起動
echo "Frontend起動中..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# サーバー起動待機
echo "サーバー起動待機中..."
sleep 15

# Health check
echo "Health check実行中..."
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:3000 || echo "Frontend may be on a different port"

# Phase 1 E2Eテスト実行
echo "Phase 1 E2Eテスト実行中..."
npx playwright test tests/e2e/phase1-gitlab-connection.spec.ts

echo "Phase 1 テスト完了！"

# プロセス終了
echo "サーバー停止中..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true

echo "Phase 1 完了: GitLab接続設定・基本テスト成功"
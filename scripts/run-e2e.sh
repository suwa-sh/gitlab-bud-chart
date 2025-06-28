#!/bin/bash
set -e

echo "=== E2E テスト実行 ==="

# Start backend
echo "1. Backend起動中..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start frontend  
echo "2. Frontend起動中..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for services to start
echo "3. サービス起動待機..."
sleep 10

# Run E2E tests
echo "4. E2Eテスト実行..."
npm run test:e2e

# Cleanup
echo "5. クリーンアップ..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true

echo "✅ E2Eテスト完了"
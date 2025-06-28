#!/bin/bash
set -e

echo "=== GitLab Bud Chart 開発環境セットアップ ==="

# Backend setup
echo "1. Backend環境構築..."
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend環境構築完了"

# Frontend setup  
echo "2. Frontend環境構築..."
cd ../frontend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

echo "✅ Frontend環境構築完了"

echo "=== セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "1. Backend起動: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "2. Frontend起動: cd frontend && npm run dev"
echo "3. E2Eテスト: cd frontend && npm run test:e2e"
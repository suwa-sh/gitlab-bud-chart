#!/bin/bash
set -e

echo "=== GitLab Bud Chart セットアップ ==="

# Backend setup
echo "1. Backend環境構築..."
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install poetry
poetry install

echo "✅ Backend環境構築完了"

# Frontend setup  
echo "2. Frontend環境構築..."
cd ../frontend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

echo "✅ Frontend環境構築完了"

# Create initial files
echo "3. 初期ファイル作成..."
cd ..

# Backend initial files
mkdir -p backend/app/{api,services,models,tests}
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/config.py

# Frontend initial files  
mkdir -p frontend/src/{components,hooks,services,types,utils}
mkdir -p frontend/src/components/{Dashboard,PBLViewer,IssueList,Chart,Common,GitLabConfig}
mkdir -p frontend/tests/{unit,e2e}

echo "✅ プロジェクト構造作成完了"

echo "=== セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "1. Backend起動: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "2. Frontend起動: cd frontend && npm run dev"
echo "3. E2Eテスト: cd frontend && npm run test:e2e"
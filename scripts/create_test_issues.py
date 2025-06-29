#!/usr/bin/env python3
"""
GitLab test-projectに20個のテストIssueを作成するスクリプト
"""
import requests
import json
from datetime import datetime, timedelta
import random

# GitLab設定
GITLAB_URL = "http://localhost:8080"
PROJECT_ID = 1
ACCESS_TOKEN = "glpat-cnHyDV8kvvz4Z_3ASq8g"

# API設定
headers = {
    "PRIVATE-TOKEN": ACCESS_TOKEN,
    "Content-Type": "application/json"
}

# テストデータ定義
issues_data = [
    # Phase 1: 初期開発 (Issues 1-5)
    {
        "title": "Issue 1: プロジェクトセットアップ",
        "description": "開発環境の構築とプロジェクト初期設定",
        "labels": ["p:3.0", "#完了", "s:infrastructure", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 15
    },
    {
        "title": "Issue 2: データベース設計",
        "description": "PostgreSQLデータベーススキーマの設計と実装",
        "labels": ["p:5.0", "#完了", "s:backend", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 12
    },
    {
        "title": "Issue 3: 認証システム実装",
        "description": "JWT認証システムの実装",
        "labels": ["p:8.0", "#完了", "s:backend", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 10
    },
    {
        "title": "Issue 4: フロントエンド基本設計",
        "description": "React + TypeScriptの基本設計",
        "labels": ["p:5.0", "#完了", "s:frontend", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 8
    },
    {
        "title": "Issue 5: CI/CDパイプライン構築",
        "description": "GitHub ActionsによるCI/CD環境構築",
        "labels": ["p:3.0", "#完了", "s:infrastructure", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 7
    },
    
    # Phase 2: 機能開発 (Issues 6-10)
    {
        "title": "Issue 6: ユーザー管理API",
        "description": "ユーザーCRUD APIの実装",
        "labels": ["p:5.0", "#完了", "s:backend", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 5
    },
    {
        "title": "Issue 7: ダッシュボード画面",
        "description": "メインダッシュボード画面の実装",
        "labels": ["p:8.0", "#完了", "s:frontend", "@FY25Q1"],
        "closed": True,
        "closed_days_ago": 3
    },
    {
        "title": "Issue 8: チャート機能実装",
        "description": "Rechartsを使用したチャート表示機能",
        "labels": ["p:5.0", "#作業中", "s:frontend", "@FY25Q1"],
        "assignee": 1,  # root user
        "closed": False
    },
    {
        "title": "Issue 9: 検索機能実装",
        "description": "全文検索機能の実装",
        "labels": ["p:8.0", "#作業中", "s:backend", "@FY25Q1"],
        "assignee": 1,
        "closed": False
    },
    {
        "title": "Issue 10: 通知システム",
        "description": "リアルタイム通知システムの実装",
        "labels": ["p:13.0", "#作業中", "s:backend", "@FY25Q1"],
        "assignee": 1,
        "closed": False
    },
    
    # Phase 3: 品質向上 (Issues 11-15)
    {
        "title": "Issue 11: 単体テスト追加",
        "description": "バックエンドの単体テストカバレッジ向上",
        "labels": ["p:5.0", "#ToDo", "s:backend", "@FY25Q1"],
        "closed": False
    },
    {
        "title": "Issue 12: E2Eテスト実装",
        "description": "Playwrightによる E2Eテスト実装",
        "labels": ["p:8.0", "#ToDo", "s:frontend", "@FY25Q1"],
        "closed": False
    },
    {
        "title": "Issue 13: パフォーマンス最適化",
        "description": "レスポンスタイム改善とキャッシュ実装",
        "labels": ["p:5.0", "#ToDo", "s:backend", "@FY25Q1"],
        "closed": False
    },
    {
        "title": "Issue 14: セキュリティ監査",
        "description": "セキュリティ脆弱性の調査と対策",
        "labels": ["p:3.0", "#ToDo", "s:infrastructure", "@FY25Q1"],
        "closed": False
    },
    {
        "title": "Issue 15: アクセシビリティ改善",
        "description": "WCAG 2.1準拠のためのUI改善",
        "labels": ["p:5.0", "#ToDo", "s:frontend", "@FY25Q2"],
        "closed": False
    },
    
    # Phase 4: 新機能 (Issues 16-20)
    {
        "title": "Issue 16: モバイルアプリ開発",
        "description": "React Nativeによるモバイルアプリ開発",
        "labels": ["p:21.0", "s:frontend", "@FY25Q2"],
        "closed": False
    },
    {
        "title": "Issue 17: API v2設計",
        "description": "GraphQL APIの設計と実装",
        "labels": ["p:13.0", "s:backend", "@FY25Q2"],
        "closed": False
    },
    {
        "title": "Issue 18: 多言語対応",
        "description": "i18n実装による多言語サポート",
        "labels": ["p:8.0", "s:frontend", "@FY25Q2"],
        "closed": False
    },
    {
        "title": "Issue 19: AI機能統合",
        "description": "機械学習モデルの統合",
        "labels": ["p:13.0", "s:backend", "@FY25Q2"],
        "closed": False
    },
    {
        "title": "Issue 20: エンタープライズ機能",
        "description": "SSO、監査ログ等のエンタープライズ機能",
        "labels": ["p:21.0", "s:infrastructure", "@FY25Q2"],
        "closed": False
    }
]

def create_issue(issue_data):
    """GitLabにIssueを作成"""
    url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/issues"
    
    # 基本データ
    data = {
        "title": issue_data["title"],
        "description": issue_data["description"],
        "labels": ",".join(issue_data["labels"])
    }
    
    # Assigneeがある場合
    if "assignee" in issue_data:
        data["assignee_id"] = issue_data["assignee"]
    
    # Issue作成
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        issue = response.json()
        print(f"✅ Created: {issue['title']} (ID: {issue['iid']})")
        
        # 完了済みの場合はクローズ
        if issue_data.get("closed", False):
            close_url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/issues/{issue['iid']}"
            close_data = {"state_event": "close"}
            
            # クローズ日時を過去に設定（APIでは直接設定できないため、作成後即クローズ）
            close_response = requests.put(close_url, headers=headers, json=close_data)
            
            if close_response.status_code == 200:
                print(f"  └─ Closed issue {issue['iid']}")
            else:
                print(f"  └─ ❌ Failed to close issue {issue['iid']}: {close_response.text}")
                
        return issue
    else:
        print(f"❌ Failed to create: {issue_data['title']}")
        print(f"   Response: {response.text}")
        return None

def main():
    """メイン処理"""
    print("🚀 GitLab Test Issues Creation Script")
    print(f"Target: {GITLAB_URL}/projects/{PROJECT_ID}")
    print("=" * 50)
    
    # 既存のIssueを確認
    check_url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/issues"
    check_response = requests.get(check_url, headers=headers)
    
    if check_response.status_code == 200:
        existing_issues = check_response.json()
        print(f"📊 現在のIssue数: {len(existing_issues)}")
        
        if len(existing_issues) > 1:
            print("⚠️  既にIssueが存在します。続行しますか？ (y/n): ", end="")
            if input().lower() != 'y':
                print("❌ 処理を中止しました")
                return
    
    print("\n📝 Creating test issues...")
    print("=" * 50)
    
    created_count = 0
    for issue_data in issues_data:
        issue = create_issue(issue_data)
        if issue:
            created_count += 1
    
    print("=" * 50)
    print(f"✅ 完了: {created_count}/{len(issues_data)} issues created")
    
    # 統計情報表示
    stats_response = requests.get(check_url, headers=headers)
    if stats_response.status_code == 200:
        all_issues = stats_response.json()
        
        open_count = sum(1 for i in all_issues if i['state'] == 'opened')
        closed_count = sum(1 for i in all_issues if i['state'] == 'closed')
        
        print(f"\n📊 Issue統計:")
        print(f"  - Total: {len(all_issues)}")
        print(f"  - Open: {open_count}")
        print(f"  - Closed: {closed_count}")

if __name__ == "__main__":
    main()
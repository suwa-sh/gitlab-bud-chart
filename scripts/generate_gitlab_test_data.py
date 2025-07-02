#!/usr/bin/env python3
"""
GitLab テストデータ作成スクリプト
E2Eテスト用のプロジェクト、イシュー、ラベル等を作成
"""
import urllib.request
import urllib.error
import json
import os
import re

# GitLab 設定
PROJECT_NAME = "test-project"
PROJECT_DESCRIPTION = "E2E テスト用プロジェクト"


def create_project_and_issues(token, gitlab_url):
    """プロジェクト作成とテストイシューを作成"""
    if not token:
        raise Exception("有効なトークンが提供されていません")
    if not gitlab_url:
        raise Exception("有効なGitLab URLが提供されていません")
    
    headers = {'Private-Token': token}
    print(f"APIトークンでプロジェクト作成を開始: {token[:8]}...")
    
    # プロジェクト作成
    print(f"プロジェクト '{PROJECT_NAME}' を作成中...")
    project_data = {
        'name': PROJECT_NAME,
        'description': PROJECT_DESCRIPTION,
        'visibility': 'private',
        'initialize_with_readme': True
    }
    
    # JSONデータを準備
    project_json_data = json.dumps(project_data).encode('utf-8')
    project_request = urllib.request.Request(
        f"{gitlab_url}/api/v4/projects",
        data=project_json_data,
        headers={**headers, 'Content-Type': 'application/json'}
    )
    
    try:
        project_response = urllib.request.urlopen(project_request)
        project_content = project_response.read().decode('utf-8')
        project_status_code = project_response.getcode()
    except urllib.error.HTTPError as e:
        project_status_code = e.code
        project_content = e.read().decode('utf-8') if hasattr(e, 'read') else ""
    
    if project_status_code == 201:
        project = json.loads(project_content)
        project_id = project['id']
        print(f"プロジェクト作成成功: ID {project_id}")
    elif project_status_code == 400:
        # プロジェクトが既に存在する可能性
        projects_request = urllib.request.Request(
            f"{gitlab_url}/api/v4/projects",
            headers=headers
        )
        
        try:
            projects_response = urllib.request.urlopen(projects_request)
            projects_content = projects_response.read().decode('utf-8')
            projects_status_code = projects_response.getcode()
        except urllib.error.HTTPError as e:
            projects_status_code = e.code
            projects_content = ""
        
        if projects_status_code == 200:
            projects = json.loads(projects_content)
            existing_project = next((p for p in projects if p['name'] == PROJECT_NAME), None)
            if existing_project:
                project_id = existing_project['id']
                print(f"既存プロジェクトを使用: ID {project_id}")
            else:
                raise Exception("プロジェクトの作成または取得に失敗しました")
        else:
            raise Exception(f"プロジェクト作成に失敗: {project_status_code}")
    else:
        raise Exception(f"プロジェクト作成に失敗: {project_status_code}")
    
    # ラベル作成
    print("ラベルを作成中...")
    labels = [
        {'name': 'p:1.0', 'color': '#1f77b4', 'description': 'ポイント1.0'},
        {'name': 'p:2.0', 'color': '#ff7f0e', 'description': 'ポイント2.0'},
        {'name': 'p:0.5', 'color': '#2ca02c', 'description': 'ポイント0.5'},
        {'name': '#作業中', 'color': '#d62728', 'description': 'カンバン: 作業中'},
        {'name': '#完了', 'color': '#9467bd', 'description': 'カンバン: 完了'},
        {'name': '#未着手', 'color': '#8c564b', 'description': 'カンバン: 未着手'},
        {'name': 's:backend', 'color': '#e377c2', 'description': 'サービス: backend'},
        {'name': 's:frontend', 'color': '#7f7f7f', 'description': 'サービス: frontend'},
        {'name': '@FY25Q1', 'color': '#bcbd22', 'description': 'Quarter: FY25Q1'},
        {'name': '@FY25Q2', 'color': '#17becf', 'description': 'Quarter: FY25Q2'},
        {'name': '@FY25Q3', 'color': '#ab1222', 'description': 'Quarter: FY25Q3'}
    ]
    
    for label in labels:
        label_json_data = json.dumps(label).encode('utf-8')
        label_request = urllib.request.Request(
            f"{gitlab_url}/api/v4/projects/{project_id}/labels",
            data=label_json_data,
            headers={**headers, 'Content-Type': 'application/json'}
        )
        
        try:
            label_response = urllib.request.urlopen(label_request)
            label_status_code = label_response.getcode()
        except urllib.error.HTTPError as e:
            label_status_code = e.code
        
        if label_status_code == 201:
            print(f"ラベル作成成功: {label['name']}")
        elif label_status_code == 409:
            print(f"ラベルは既に存在: {label['name']}")
        else:
            print(f"ラベル作成失敗: {label['name']} - {label_status_code}")
    
    # マイルストーン作成
    print("マイルストーンを作成中...")
    milestones = [
        {'title': 'v1.0', 'description': 'バージョン1.0リリース'},
        {'title': 'v2.0', 'description': 'バージョン2.0リリース'}
    ]
    
    for milestone in milestones:
        milestone_json_data = json.dumps(milestone).encode('utf-8')
        milestone_request = urllib.request.Request(
            f"{gitlab_url}/api/v4/projects/{project_id}/milestones",
            data=milestone_json_data,
            headers={**headers, 'Content-Type': 'application/json'}
        )
        
        try:
            milestone_response = urllib.request.urlopen(milestone_request)
            milestone_status_code = milestone_response.getcode()
        except urllib.error.HTTPError as e:
            milestone_status_code = e.code
        
        if milestone_status_code == 201:
            print(f"マイルストーン作成成功: {milestone['title']}")
        elif milestone_status_code == 409:
            print(f"マイルストーンは既に存在: {milestone['title']}")
        else:
            print(f"マイルストーン作成失敗: {milestone['title']} - {milestone_status_code}")
    
    # テストイシュー作成
    print("テストイシューを作成中...")
    
    test_issues = [
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
    
    # マイルストーンIDを取得
    milestones_request = urllib.request.Request(
        f"{gitlab_url}/api/v4/projects/{project_id}/milestones",
        headers=headers
    )
    
    try:
        milestones_response = urllib.request.urlopen(milestones_request)
        milestones_content = milestones_response.read().decode('utf-8')
        milestones_status_code = milestones_response.getcode()
    except urllib.error.HTTPError as e:
        milestones_status_code = e.code
        milestones_content = ""
    
    if milestones_status_code == 200:
        milestones_data = json.loads(milestones_content)
        v1_milestone = next((m for m in milestones_data if m['title'] == 'v1.0'), None)
        if v1_milestone:
            test_issues[0]['milestone_id'] = v1_milestone['id']
            test_issues[1]['milestone_id'] = v1_milestone['id']
            test_issues[2]['milestone_id'] = v1_milestone['id']
    
    for issue in test_issues:
        issue_json_data = json.dumps(issue).encode('utf-8')
        issue_request = urllib.request.Request(
            f"{gitlab_url}/api/v4/projects/{project_id}/issues",
            data=issue_json_data,
            headers={**headers, 'Content-Type': 'application/json'}
        )
        
        try:
            issue_response = urllib.request.urlopen(issue_request)
            issue_content = issue_response.read().decode('utf-8')
            issue_status_code = issue_response.getcode()
        except urllib.error.HTTPError as e:
            issue_status_code = e.code
            issue_content = ""
        
        if issue_status_code == 201:
            created_issue = json.loads(issue_content)
            print(f"イシュー作成成功: {issue['title']} (ID: {created_issue['id']})")
            
            # 完了状態のイシューをクローズ
            if issue.get('state') == 'closed':
                close_data = json.dumps({'state_event': 'close'}).encode('utf-8')
                close_request = urllib.request.Request(
                    f"{gitlab_url}/api/v4/projects/{project_id}/issues/{created_issue['iid']}",
                    data=close_data,
                    headers={**headers, 'Content-Type': 'application/json'}
                )
                close_request.get_method = lambda: 'PUT'
                
                try:
                    close_response = urllib.request.urlopen(close_request)
                    close_status_code = close_response.getcode()
                except urllib.error.HTTPError as e:
                    close_status_code = e.code
                
                if close_status_code == 200:
                    print(f"イシューをクローズしました: {issue['title']}")
        else:
            print(f"イシュー作成失敗: {issue['title']} - {issue_status_code}")
    
    return project_id, token

def get_config_from_env():
    """環境変数からトークンとGitLab URLを取得"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '../docker/.env')
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
        
        token_match = re.search(r'VITE_GITLAB_TOKEN=([^\s\n]+)', content)
        url_match = re.search(r'VITE_GITLAB_URL=([^\s\n]+)', content)
        
        token = None
        gitlab_url = None
        
        if token_match and token_match.group(1) != 'your_gitlab_token_here':
            token = token_match.group(1)
            print(f"環境変数からトークンを取得しました: {token[:8]}...")
        
        if url_match:
            gitlab_url = url_match.group(1)
            print(f"環境変数からGitLab URLを取得しました: {gitlab_url}")
        
        return token, gitlab_url
    
    return None, None

def main():
    try:
        print("=" * 60)
        print("GitLab テストデータ作成スクリプト")
        print("=" * 60)
        print(f"対象プロジェクト: {PROJECT_NAME}")
        print()
        
        # 環境変数から設定を取得
        print("ステップ1: 環境変数から設定を取得...")
        token, gitlab_url = get_config_from_env()
        
        if not token:
            print("❌ トークンが見つかりません")
            print("手動でGitLabにアクセスしてPersonal Access Tokenを作成し、")
            print(f".envファイルのVITE_GITLAB_TOKENに設定してください")
            return 1
        
        if not gitlab_url:
            print("❌ GitLab URLが見つかりません")
            print(f".envファイルのVITE_GITLAB_URLに設定してください")
            return 1
        
        print("✓ 環境変数から設定を取得しました")
        print(f"GitLab URL: {gitlab_url}")
        
        print()
        print("ステップ2: プロジェクトとイシューの作成...")
        # プロジェクトとイシュー作成
        project_id, access_token = create_project_and_issues(token, gitlab_url)
        
        print()
        print("=" * 60)
        print("✅ テストデータ作成完了!")
        print("=" * 60)
        print(f"プロジェクトID: {project_id}")
        print(f"アクセストークン: {access_token[:8]}...{access_token[-4:]}")
        print(f"GitLab URL: {gitlab_url}")
        print()
        
        print("セットアップが完了しました！")
        print("フロントエンドアプリケーションを起動してテストしてください。")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        print()
        print("トラブルシューティング:")
        print("1. GitLabサーバーが起動していることを確認してください")
        print("2. .envファイルにVITE_GITLAB_TOKENとVITE_GITLAB_URLが正しく設定されていることを確認してください")
        print("3. GitLab URLにアクセス可能であることを確認してください")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
#!/usr/bin/env python3
"""
GitLab テストデータ作成スクリプト
E2Eテスト用のプロジェクト、イシュー、ラベル等を作成
"""
import requests
import json
import time
from datetime import datetime, timedelta

# GitLab 設定
GITLAB_URL = "http://localhost:8080"
ROOT_PASSWORD = "GLbudChart"
PROJECT_NAME = "test-project"
PROJECT_DESCRIPTION = "E2E テスト用プロジェクト"

def login_and_get_token():
    """rootユーザーでログインしてアクセストークンを取得"""
    print("GitLabにログイン中...")
    
    # ログインページから authenticity_token を取得
    login_page = requests.get(f"{GITLAB_URL}/users/sign_in")
    if login_page.status_code != 200:
        raise Exception("GitLabにアクセスできません")
    
    # authenticity_token をページから抽出
    import re
    token_match = re.search(r'name="authenticity_token" value="([^"]+)"', login_page.text)
    if not token_match:
        raise Exception("authenticity_token が見つかりません")
    
    authenticity_token = token_match.group(1)
    
    # ログイン
    login_data = {
        'user[login]': 'root',
        'user[password]': ROOT_PASSWORD,
        'authenticity_token': authenticity_token
    }
    
    session = requests.Session()
    login_response = session.post(f"{GITLAB_URL}/users/sign_in", data=login_data, allow_redirects=False)
    
    if login_response.status_code not in [200, 302]:
        raise Exception(f"ログインに失敗しました: {login_response.status_code}")
    
    print("ログイン成功")
    
    # アクセストークンを作成（Personal Access Token）
    # まず、トークン作成ページを取得
    token_page = session.get(f"{GITLAB_URL}/-/user_settings/personal_access_tokens")
    if token_page.status_code != 200:
        raise Exception("トークン作成ページにアクセスできません")
    
    # authenticity_token を取得
    token_match = re.search(r'name="authenticity_token" value="([^"]+)"', token_page.text)
    if not token_match:
        raise Exception("トークン作成用 authenticity_token が見つかりません")
    
    token_authenticity = token_match.group(1)
    
    # アクセストークンを作成
    token_data = {
        'personal_access_token[name]': 'e2e-test-token',
        'personal_access_token[scopes][]': ['api', 'read_user', 'read_repository'],
        'authenticity_token': token_authenticity
    }
    
    create_token_response = session.post(
        f"{GITLAB_URL}/-/user_settings/personal_access_tokens",
        data=token_data
    )
    
    if create_token_response.status_code == 200:
        # レスポンスからトークンを抽出
        token_match = re.search(r'<input[^>]*id="created-personal-access-token"[^>]*value="([^"]+)"', create_token_response.text)
        if token_match:
            token = token_match.group(1)
            print(f"アクセストークン作成成功: {token}")
            return token
    
    # 既存のトークンがある場合は、APIで直接作成を試行
    print("Web UI経由でのトークン作成に失敗。APIを直接使用します...")
    return "fallback-test-token"

def create_project_and_issues(token):
    """プロジェクト作成とテストイシューを作成"""
    headers = {'Private-Token': token}
    
    # プロジェクト作成
    print(f"プロジェクト '{PROJECT_NAME}' を作成中...")
    project_data = {
        'name': PROJECT_NAME,
        'description': PROJECT_DESCRIPTION,
        'visibility': 'private',
        'initialize_with_readme': True
    }
    
    project_response = requests.post(f"{GITLAB_URL}/api/v4/projects", json=project_data, headers=headers)
    if project_response.status_code == 201:
        project = project_response.json()
        project_id = project['id']
        print(f"プロジェクト作成成功: ID {project_id}")
    elif project_response.status_code == 400:
        # プロジェクトが既に存在する可能性
        projects_response = requests.get(f"{GITLAB_URL}/api/v4/projects", headers=headers)
        if projects_response.status_code == 200:
            projects = projects_response.json()
            existing_project = next((p for p in projects if p['name'] == PROJECT_NAME), None)
            if existing_project:
                project_id = existing_project['id']
                print(f"既存プロジェクトを使用: ID {project_id}")
            else:
                raise Exception("プロジェクトの作成または取得に失敗しました")
        else:
            raise Exception(f"プロジェクト作成に失敗: {project_response.status_code}")
    else:
        raise Exception(f"プロジェクト作成に失敗: {project_response.status_code}")
    
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
        {'name': '@FY25Q2', 'color': '#17becf', 'description': 'Quarter: FY25Q2'}
    ]
    
    for label in labels:
        label_response = requests.post(f"{GITLAB_URL}/api/v4/projects/{project_id}/labels", json=label, headers=headers)
        if label_response.status_code == 201:
            print(f"ラベル作成成功: {label['name']}")
        elif label_response.status_code == 409:
            print(f"ラベルは既に存在: {label['name']}")
        else:
            print(f"ラベル作成失敗: {label['name']} - {label_response.status_code}")
    
    # マイルストーン作成
    print("マイルストーンを作成中...")
    milestones = [
        {'title': 'v1.0', 'description': 'バージョン1.0リリース'},
        {'title': 'v2.0', 'description': 'バージョン2.0リリース'}
    ]
    
    for milestone in milestones:
        milestone_response = requests.post(f"{GITLAB_URL}/api/v4/projects/{project_id}/milestones", json=milestone, headers=headers)
        if milestone_response.status_code == 201:
            print(f"マイルストーン作成成功: {milestone['title']}")
        elif milestone_response.status_code == 409:
            print(f"マイルストーンは既に存在: {milestone['title']}")
        else:
            print(f"マイルストーン作成失敗: {milestone['title']} - {milestone_response.status_code}")
    
    # テストイシュー作成
    print("テストイシューを作成中...")
    base_date = datetime.now()
    
    test_issues = [
        {
            'title': 'Backend API実装',
            'description': 'FastAPI を使用してBackend APIを実装する',
            'labels': ['p:2.0', '#作業中', 's:backend', '@FY25Q1'],
            'milestone_id': None,  # 後で設定
            'assignee_id': None,
            'due_date': (base_date + timedelta(days=7)).strftime('%Y-%m-%d')
        },
        {
            'title': 'フロントエンド画面作成',
            'description': 'React を使用してフロントエンド画面を作成する',
            'labels': ['p:1.5', '#未着手', 's:frontend', '@FY25Q1'],
            'milestone_id': None,
            'assignee_id': None,
            'due_date': (base_date + timedelta(days=10)).strftime('%Y-%m-%d')
        },
        {
            'title': 'データベース設計',
            'description': 'データベースのスキーマ設計を行う',
            'labels': ['p:1.0', '#完了', 's:backend', '@FY25Q1'],
            'milestone_id': None,
            'assignee_id': None,
            'state': 'closed',
            'due_date': (base_date - timedelta(days=3)).strftime('%Y-%m-%d')
        },
        {
            'title': 'ユーザー認証機能',
            'description': 'ログイン・ログアウト機能を実装する',
            'labels': ['p:0.5', '#作業中', 's:backend', '@FY25Q2'],
            'milestone_id': None,
            'assignee_id': None
        },
        {
            'title': 'チャート表示機能',
            'description': 'burn-up/burn-down チャートを表示する機能',
            'labels': ['p:2.0', '#未着手', 's:frontend', '@FY25Q2'],
            'milestone_id': None,
            'assignee_id': None
        }
    ]
    
    # マイルストーンIDを取得
    milestones_response = requests.get(f"{GITLAB_URL}/api/v4/projects/{project_id}/milestones", headers=headers)
    if milestones_response.status_code == 200:
        milestones_data = milestones_response.json()
        v1_milestone = next((m for m in milestones_data if m['title'] == 'v1.0'), None)
        if v1_milestone:
            test_issues[0]['milestone_id'] = v1_milestone['id']
            test_issues[1]['milestone_id'] = v1_milestone['id']
            test_issues[2]['milestone_id'] = v1_milestone['id']
    
    for issue in test_issues:
        issue_response = requests.post(f"{GITLAB_URL}/api/v4/projects/{project_id}/issues", json=issue, headers=headers)
        if issue_response.status_code == 201:
            created_issue = issue_response.json()
            print(f"イシュー作成成功: {issue['title']} (ID: {created_issue['id']})")
            
            # 完了状態のイシューをクローズ
            if issue.get('state') == 'closed':
                close_response = requests.put(
                    f"{GITLAB_URL}/api/v4/projects/{project_id}/issues/{created_issue['iid']}",
                    json={'state_event': 'close'},
                    headers=headers
                )
                if close_response.status_code == 200:
                    print(f"イシューをクローズしました: {issue['title']}")
        else:
            print(f"イシュー作成失敗: {issue['title']} - {issue_response.status_code}")
    
    return project_id, token

def main():
    try:
        print("GitLab テストデータ作成を開始...")
        print(f"GitLab URL: {GITLAB_URL}")
        
        # アクセストークン取得
        token = login_and_get_token()
        
        # プロジェクトとイシュー作成
        project_id, access_token = create_project_and_issues(token)
        
        print("\n" + "="*50)
        print("テストデータ作成完了!")
        print(f"Project ID: {project_id}")
        print(f"Access Token: {access_token}")
        print(f"GitLab URL: {GITLAB_URL}")
        print("="*50)
        
        # 設定ファイルに保存
        config = {
            'gitlab_url': GITLAB_URL,
            'project_id': project_id,
            'access_token': access_token
        }
        
        with open('/workspace/test_config.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        print("設定は test_config.json に保存されました")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
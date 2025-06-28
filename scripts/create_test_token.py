#!/usr/bin/env python3
"""
GitLab API テスト用の簡易トークン作成とテストデータ作成
"""
import requests
import json
from datetime import datetime, timedelta

GITLAB_URL = "http://localhost:8080"

def test_with_existing_token():
    """既存のトークンまたは仮のトークンでテスト"""
    # まずは、root のデフォルトAPIアクセスを試行
    possible_tokens = [
        "glpat-test-token-12345",  # テスト用仮トークン
        "root-token",
        "test-token"
    ]
    
    for token in possible_tokens:
        headers = {'Private-Token': token}
        
        # API接続テスト
        try:
            response = requests.get(f"{GITLAB_URL}/api/v4/user", headers=headers, timeout=5)
            if response.status_code == 200:
                print(f"トークン接続成功: {token}")
                return token
            else:
                print(f"トークン失敗 {token}: {response.status_code}")
        except Exception as e:
            print(f"接続エラー {token}: {e}")
    
    return None

def create_test_project_with_api(token):
    """APIを使用してテストプロジェクトを作成"""
    headers = {'Private-Token': token}
    project_name = "test-project"
    
    # プロジェクト作成
    project_data = {
        'name': project_name,
        'description': 'E2E テスト用プロジェクト',
        'visibility': 'public',  # 公開設定で作成
        'initialize_with_readme': True
    }
    
    print(f"プロジェクト作成中: {project_name}")
    response = requests.post(f"{GITLAB_URL}/api/v4/projects", json=project_data, headers=headers)
    
    if response.status_code == 201:
        project = response.json()
        print(f"プロジェクト作成成功: {project['id']}")
        return project['id']
    elif response.status_code == 400:
        # 既存プロジェクトを検索
        projects_response = requests.get(f"{GITLAB_URL}/api/v4/projects", headers=headers)
        if projects_response.status_code == 200:
            projects = projects_response.json()
            existing = next((p for p in projects if p['name'] == project_name), None)
            if existing:
                print(f"既存プロジェクト使用: {existing['id']}")
                return existing['id']
    
    print(f"プロジェクト作成失敗: {response.status_code}")
    return None

def create_manual_test_config():
    """手動設定用のコンフィグを作成"""
    print("手動設定モードで設定ファイルを作成します...")
    
    config = {
        'gitlab_url': GITLAB_URL,
        'project_id': 1,  # デフォルトプロジェクトID
        'access_token': 'manual-token-placeholder',
        'manual_setup_required': True,
        'instructions': [
            "1. http://localhost:8080 にアクセス",
            "2. root / GLbudChart でログイン",
            "3. プロジェクト 'test-project' を作成",
            "4. Personal Access Token を作成 (api, read_user, read_repository スコープ)",
            "5. 下記のラベルを作成:",
            "   - p:1.0, p:2.0, p:0.5 (ポイント)",
            "   - #作業中, #完了, #未着手 (カンバン)",
            "   - s:backend, s:frontend (サービス)",
            "   - @FY25Q1, @FY25Q2 (Quarter)",
            "6. テストイシューを5件程度作成"
        ]
    }
    
    with open('/workspace/test_config.json', 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print("設定ファイルを作成しました: test_config.json")
    return config

def main():
    print("GitLab テスト環境設定を開始...")
    
    # 既存トークンでのテスト
    token = test_with_existing_token()
    
    if token:
        project_id = create_test_project_with_api(token)
        if project_id:
            config = {
                'gitlab_url': GITLAB_URL,
                'project_id': project_id,
                'access_token': token
            }
            with open('/workspace/test_config.json', 'w') as f:
                json.dump(config, f, indent=2)
            print("自動設定完了!")
            return 0
    
    # 手動設定にフォールバック
    create_manual_test_config()
    return 0

if __name__ == "__main__":
    exit(main())
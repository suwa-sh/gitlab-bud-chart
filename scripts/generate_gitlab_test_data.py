#!/usr/bin/env python3
"""
GitLab テストデータ作成スクリプト
E2Eテスト用のプロジェクト、イシュー、ラベル等を作成

使用方法:
  python generate_gitlab_test_data.py                           # デフォルト名で作成
  python generate_gitlab_test_data.py "my-project"              # カスタムプロジェクト名で作成
  python generate_gitlab_test_data.py "my-project" "説明文"      # プロジェクト名と説明文を指定

デフォルト設定:
  プロジェクト名: test-project
  説明文: E2E テスト用プロジェクト
"""
import urllib.request
import urllib.error
import json
import os
import re
from datetime import datetime, timedelta

# GitLab 設定（デフォルト値）
DEFAULT_PROJECT_NAME = "test-project"
DEFAULT_PROJECT_DESCRIPTION = "E2E テスト用プロジェクト"

# テスト期間設定（境界テスト用）
TEST_PERIOD_START = "2024-01-01"
TEST_PERIOD_END = "2024-03-31"

def format_iso8601_datetime(date_str, time_str="12:00:00"):
    """日付文字列をISO 8601フォーマット（UTC）に変換"""
    return f"{date_str}T{time_str}Z"

def get_test_datetime(date_str, time_str="12:00:00"):
    """テスト用の日付文字列をISO 8601フォーマットで返す"""
    return format_iso8601_datetime(date_str, time_str)


def create_project_and_issues(token, gitlab_url, project_name=None, project_description=None):
    """プロジェクト作成とテストイシューを作成"""
    if not token:
        raise Exception("有効なトークンが提供されていません")
    if not gitlab_url:
        raise Exception("有効なGitLab URLが提供されていません")
    
    # プロジェクト名とdescriptionのデフォルト値設定
    if project_name is None:
        project_name = DEFAULT_PROJECT_NAME
    if project_description is None:
        project_description = DEFAULT_PROJECT_DESCRIPTION
    
    headers = {'Private-Token': token}
    print(f"APIトークンでプロジェクト作成を開始: {token[:8]}...")
    
    # プロジェクト作成
    print(f"プロジェクト '{project_name}' を作成中...")
    project_data = {
        'name': project_name,
        'description': project_description,
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
            existing_project = next((p for p in projects if p['name'] == project_name), None)
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
        # ポイントラベル
        {'name': 'p:0.5', 'color': '#2ca02c', 'description': 'ポイント0.5'},
        {'name': 'p:1.0', 'color': '#1f77b4', 'description': 'ポイント1.0'},
        {'name': 'p:2.0', 'color': '#ff7f0e', 'description': 'ポイント2.0'},
        {'name': 'p:3.0', 'color': '#1abc9c', 'description': 'ポイント3.0'},
        {'name': 'p:5.0', 'color': '#e74c3c', 'description': 'ポイント5.0'},
        {'name': 'p:8.0', 'color': '#3498db', 'description': 'ポイント8.0'},
        {'name': 'p:13.0', 'color': '#9b59b6', 'description': 'ポイント13.0'},
        {'name': 'p:21.0', 'color': '#f39c12', 'description': 'ポイント21.0'},
        # カンバンステータス
        {'name': '#作業中', 'color': '#d62728', 'description': 'カンバン: 作業中'},
        {'name': '#完了', 'color': '#9467bd', 'description': 'カンバン: 完了'},
        {'name': '#未着手', 'color': '#8c564b', 'description': 'カンバン: 未着手'},
        {'name': '#ToDo', 'color': '#e67e22', 'description': 'カンバン: ToDo'},
        # 統一フィルタ除外対象
        {'name': '#テンプレート', 'color': '#95a5a6', 'description': 'カンバン: テンプレート（除外対象）'},
        {'name': '#ゴール/アナウンス', 'color': '#34495e', 'description': 'カンバン: ゴール/アナウンス（除外対象）'},
        {'name': '#不要', 'color': '#7f8c8d', 'description': 'カンバン: 不要（除外対象）'},
        # サービス分類
        {'name': 's:backend', 'color': '#e377c2', 'description': 'サービス: backend'},
        {'name': 's:frontend', 'color': '#7f7f7f', 'description': 'サービス: frontend'},
        {'name': 's:infrastructure', 'color': '#27ae60', 'description': 'サービス: infrastructure'},
        {'name': 's:API', 'color': '#3498db', 'description': 'サービス: API'},
        # 四半期分類
        {'name': '@FY23Q4', 'color': '#ff7f0e', 'description': 'Quarter: FY23Q4'},
        {'name': '@FY24Q1', 'color': '#bcbd22', 'description': 'Quarter: FY24Q1'},
        {'name': '@FY24Q2', 'color': '#17becf', 'description': 'Quarter: FY24Q2'},
        {'name': '@FY25Q1', 'color': '#ab1222', 'description': 'Quarter: FY25Q1'},
        {'name': '@FY25Q2', 'color': '#9b59b6', 'description': 'Quarter: FY25Q2'},
        {'name': '@FY25Q3', 'color': '#e74c3c', 'description': 'Quarter: FY25Q3'}
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
        {'title': 'v2.0', 'description': 'バージョン2.0リリース'},
        {'title': '2024Q1', 'description': '2024年第1四半期マイルストーン'}
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
        # README.mdスコープ判定の具体例テスト（10個）- テスト期間: 2024-01-01 ～ 2024-03-31
        {
            "title": "Issue A: [スコープ具体例] 期間内完了",
            "description": "スコープ判定具体例: created_at=2024-01-15, completed_at=2024-02-15（期間内完了、含まれる）",
            "labels": ["p:5.0", "#完了", "s:backend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-01-15", "10:00:00"),
            "closed": True,
            "due_date": get_test_datetime("2024-02-15", "10:00:00"),
        },
        {
            "title": "Issue B: [スコープ具体例] 未完了",
            "description": "スコープ判定具体例: created_at=2024-02-01, completed_at=null（未完了、含まれる）",
            "labels": ["p:8.0", "#作業中", "s:frontend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-02-01", "10:00:00"),
            "closed": False
        },
        {
            "title": "Issue C: [スコープ具体例] 期間外→期間内完了",
            "description": "スコープ判定具体例: created_at=2023-12-01, completed_at=2024-02-01（期間外created+期間内completed、含まれる）",
            "labels": ["p:3.0", "#完了", "s:infrastructure", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2023-12-01", "10:00:00"),
            "closed": True,
            "due_date": get_test_datetime("2024-02-01", "10:00:00"),
        },
        {
            "title": "Issue D: [スコープ具体例] 期間外→未完了",
            "description": "スコープ判定具体例: created_at=2023-11-01, completed_at=null（期間外created+未完了、含まれる）",
            "labels": ["p:13.0", "#作業中", "s:backend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2023-11-01", "10:00:00"),
            "closed": False
        },
        {
            "title": "Issue E: [スコープ具体例] 期間後→未完了",
            "description": "スコープ判定具体例: created_at=2024-04-15, completed_at=null（期間後created+未完了、含まれる）",
            "labels": ["p:21.0", "#作業中", "s:infrastructure", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-04-15", "10:00:00"),
            "closed": False
        },
        {
            "title": "Issue F: [スコープ具体例] 期間内→期間後完了",
            "description": "スコープ判定具体例: created_at=2024-02-15, completed_at=2024-04-15（期間内created+期間後completed、除外→警告表示）",
            "labels": ["p:5.0", "#完了", "s:backend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-02-15", "10:00:00"),
            "closed": True,
            "due_date": get_test_datetime("2024-04-15", "10:00:00"),
        },
        {
            "title": "Issue G: [スコープ具体例] 期間前完了",
            "description": "スコープ判定具体例: created_at=2023-11-01, completed_at=2023-12-15（期間前完了、除外→警告表示）",
            "labels": ["p:8.0", "#完了", "s:frontend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2023-11-01", "10:00:00"),
            "closed": True,
            "due_date": get_test_datetime("2023-12-15", "10:00:00"),
        },
        {
            "title": "Issue H: [スコープ具体例] テンプレート除外",
            "description": "スコープ判定具体例: kanban_status=テンプレート（統一フィルタで除外）",
            "labels": ["p:1.0", "#テンプレート", "s:backend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-02-01", "10:00:00"),
            "closed": False
        },
        {
            "title": "Issue I: [スコープ具体例] 不要除外",
            "description": "スコープ判定具体例: kanban_status=不要（統一フィルタで除外）",
            "labels": ["p:2.0", "#不要", "s:frontend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-01-10", "10:00:00"),
            "closed": True,
        },
        {
            "title": "Issue J: [スコープ具体例] 四半期フィルタ除外",
            "description": "スコープ判定具体例: @FY24Q2（対象期間外の四半期、除外）",
            "labels": ["p:5.0", "#作業中", "s:backend", "@FY24Q2"],
            "custom_created_at": get_test_datetime("2024-02-01", "10:00:00"),
            "closed": False
        },
        {
            "title": "Issue K: [スコープ具体例] Due Date未設定完了",
            "description": "スコープ判定具体例: kanban_status=完了 + due_date未設定（警告表示・スコープ除外）",
            "labels": ["p:3.0", "#完了", "s:API", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-02-01", "10:00:00"),
            "closed": True
            # due_dateを意図的に設定しない
        },
        {
            "title": "Issue L: [スコープ具体例] 期間後作成",
            "description": "スコープ判定具体例: created_at=2024-04-15（期間終了日より後に作成、警告表示・スコープ除外）",
            "labels": ["p:2.0", "#作業中", "s:frontend", "@FY23Q4"],
            "custom_created_at": get_test_datetime("2024-04-15", "10:00:00"),
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
        q1_milestone = next((m for m in milestones_data if m['title'] == '2024Q1'), None)
        
        if v1_milestone:
            test_issues[0]['milestone_id'] = v1_milestone['id']
            test_issues[1]['milestone_id'] = v1_milestone['id']
            test_issues[2]['milestone_id'] = v1_milestone['id']
        
        # milestone_titleが指定されているIssueのID設定
        for issue in test_issues:
            if 'milestone_title' in issue:
                if issue['milestone_title'] == '2024Q1' and q1_milestone:
                    issue['milestone_id'] = q1_milestone['id']
                issue.pop('milestone_title')  # APIに送らないよう削除
    
    for issue in test_issues:
        # created_atパラメータをサポート（管理者権限が必要）
        issue_data = issue.copy()
        
        # custom_created_atが指定されている場合はそれを使用
        if 'custom_created_at' in issue_data:
            issue_data['created_at'] = issue_data.pop('custom_created_at')
        
        # due_dateが指定されている場合はそのまま設定（GitLabのAPIフィールド）
        # due_dateはcompleted_at決定に影響する重要なフィールド
        
        issue_json_data = json.dumps(issue_data).encode('utf-8')
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
            if issue.get('closed') == True:
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
    import sys
    
    # コマンドライン引数の処理
    project_name = None
    project_description = None
    
    if len(sys.argv) >= 2:
        project_name = sys.argv[1]
    if len(sys.argv) >= 3:
        project_description = sys.argv[2]
    
    # デフォルト値の設定
    if project_name is None:
        project_name = DEFAULT_PROJECT_NAME
    if project_description is None:
        project_description = DEFAULT_PROJECT_DESCRIPTION
    
    try:
        print("=" * 60)
        print("GitLab テストデータ作成スクリプト")
        print("=" * 60)
        print(f"対象プロジェクト: {project_name}")
        print(f"プロジェクト説明: {project_description}")
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
        project_id, access_token = create_project_and_issues(token, gitlab_url, project_name, project_description)
        
        print()
        print("=" * 60)
        print("✅ テストデータ作成完了!")
        print("=" * 60)
        print(f"プロジェクト名: {project_name}")
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
# GitLab 手動セットアップ手順

E2Eテスト実行のため、GitLabに手動でテストデータを設定する手順です。

## 1. GitLabアクセス
- ブラウザで http://localhost:8080 にアクセス
- Username: `root`
- Password: `GLbudChart`

## 2. Personal Access Token作成
1. 右上のアバター → Settings → Access Tokens
2. Token名: `e2e-test-token`
3. Scopes: `api`, `read_user`, `read_repository` を選択
4. Create personal access tokenをクリック
5. 生成されたトークンをコピー（後で使用）

## 3. テストプロジェクト作成
1. "Create a project" または "+" → "New project"
2. Project name: `test-project`
3. Description: `E2E テスト用プロジェクト`
4. Visibility: Public
5. "Create project"をクリック

## 4. ラベル作成
プロジェクト → Settings → Labels で以下のラベルを作成:

**ポイント系ラベル:**
- `p:1.0` (青色 #1f77b4)
- `p:2.0` (オレンジ #ff7f0e)  
- `p:0.5` (緑色 #2ca02c)

**カンバン系ラベル:**
- `#作業中` (赤色 #d62728)
- `#完了` (紫色 #9467bd)
- `#未着手` (茶色 #8c564b)

**サービス系ラベル:**
- `s:backend` (ピンク #e377c2)
- `s:frontend` (グレー #7f7f7f)

**Quarter系ラベル:**
- `@FY25Q1` (黄緑 #bcbd22)
- `@FY25Q2` (シアン #17becf)

## 5. マイルストーン作成
プロジェクト → Issues → Milestones で作成:
- `v1.0` - バージョン1.0リリース
- `v2.0` - バージョン2.0リリース

## 6. テストイシュー作成
プロジェクト → Issues → New issue で以下を作成:

### Issue 1: Backend API実装
- Title: `Backend API実装`
- Description: `FastAPI を使用してBackend APIを実装する`
- Labels: `p:2.0`, `#作業中`, `s:backend`, `@FY25Q1`
- Milestone: `v1.0`
- Due date: 7日後

### Issue 2: フロントエンド画面作成  
- Title: `フロントエンド画面作成`
- Description: `React を使用してフロントエンド画面を作成する`
- Labels: `p:1.5`, `#未着手`, `s:frontend`, `@FY25Q1`
- Milestone: `v1.0`
- Due date: 10日後

### Issue 3: データベース設計
- Title: `データベース設計`
- Description: `データベースのスキーマ設計を行う`
- Labels: `p:1.0`, `#完了`, `s:backend`, `@FY25Q1`
- Milestone: `v1.0`
- Due date: 3日前 (作成後にClose)

### Issue 4: ユーザー認証機能
- Title: `ユーザー認証機能`
- Description: `ログイン・ログアウト機能を実装する`
- Labels: `p:0.5`, `#作業中`, `s:backend`, `@FY25Q2`

### Issue 5: チャート表示機能
- Title: `チャート表示機能`
- Description: `burn-up/burn-down チャートを表示する機能`
- Labels: `p:2.0`, `#未着手`, `s:frontend`, `@FY25Q2`

## 7. E2Eテスト設定
作成したProject IDとAccess Tokenを使用してE2Eテストを実行：

```bash
# test_config.jsonを手動更新
{
  "gitlab_url": "http://localhost:8080",
  "project_id": [作成したプロジェクトID],
  "access_token": "[生成したアクセストークン]"
}
```
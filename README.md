# GitLab Bud Chart

GitLab の issue を分析し、burn-up/burn-down チャート表示と product backlog 表示を行う Web アプリケーション。

## 動作イメージ

| ![](/docs/images/dashboard.png) | ![](/docs/images/pbl-viewer.png) |
| ------------------------------- | -------------------------------- |

## 使い方

- 最新のビルド済みイメージを利用する場合

  ```bash
  # 前提: port 3000 が空いていること
  git clone https://github.com/suwa-sh/gitlab-bud-chart.git
  cd gitlab-bud-chart/docker

  cat << __EOF__ > .env
  SERVER_PORT=3000
  # gitlab接続の初期値
  #VITE_GITLAB_URL=
  #VITE_GITLAB_TOKEN=
  #VITE_GITLAB_PROJECT_ID=
  #VITE_HTTP_PROXY=
  #VITE_HTTPS_PROXY=
  #VITE_NO_PROXY=
  __EOF__

  docker compose pull
  docker compose up

  open http://localhost:3000
  ```

- ローカルビルドを使用したい場合

  ```bash
  # gitlab containerを利用する場合、事前に起動
  docker compose -f docker-compose.gitlab.yml up

  # gitlab containerのPAT(Personal Access Token)生成し、docker/.envに書き込み
  ../scripts/generate_gitlab_pat.sh
  # サンプルissue登録
  ../scripts/generate_gitlab_test_data.py

  # ローカルソースをビルドして実行
  docker compose -f docker-compose.local.yml build
  docker compose -f docker-compose.local.yml up
  ```

## 画面構成

### Dashboard

- プロジェクト全体の進捗状況
- Burn-up/Burn-down チャート
- 期間選択・フィルタリング
- 統計情報表示

### PBL Viewer

- Product Backlog 一覧
- 詳細フィルタ・検索
- Issue 詳細表示
- CSV エクスポート

## 表示条件・フィルタリング

### Dashboard 表示条件

#### データ取得方法

- **API**: `/api/issues/` エンドポイントを使用
- **期間フィルタ**: `chart_start_date`, `chart_end_date` パラメータで期間指定
- **リアルタイム更新**: 設定変更時に常に API 再呼び出し
- **テンプレート除外**: `kanban_status === "--テンプレート"` を自動除外

#### チャート生成条件

- **対象データ**: 期間内のスコープフィルタ適用済み Issue
- **営業日計算**: 日本の祝日を考慮した営業日ベースの理想線
- **スコープルール**:
  1. `created_at` が期間内の Issue
  2. `created_at` が期間外でも `state=opened` の Issue
  3. `completed_at` が期間内の Issue
  4. `created_at` が期間終了日より未来の Issue は除外

#### フィルタ項目（13 種類）

1. **期間**: chart_start_date / chart_end_date
2. **Service**: サービス名での絞り込み
3. **Milestone**: マイルストーンでの絞り込み
4. **Epic**: Epic/通常 Issue での絞り込み
5. **Title**: タイトル部分一致検索
6. **Point**: 最小値・最大値での範囲指定
7. **Kanban Status**: かんばんステータスでの絞り込み
8. **Assignee**: アサイニーでの絞り込み
9. **Created At**: 作成日の期間指定
10. **Completed At**: 完了日の期間指定
11. **State**: opened/closed での状態絞り込み
12. **Chart View**: Both/Burn Down/Burn Up 表示切り替え
13. **Template Exclusion**: `--テンプレート` の自動除外

### PBL Viewer 表示条件

#### データ取得方法

- **API**: `/api/issues/` エンドポイントを使用
- **全量取得**: `per_page=10000` で大量データを一括取得
- **キャッシュ優先**: 初回ロード時はキャッシュデータを優先利用
- **期間フィルタ除外**: API 呼び出し時に期間関連フィルタを削除
- **テンプレート除外**: `kanban_status === "--テンプレート"` を自動除外

#### キャッシュ管理

- **初回ロード**: キャッシュデータがある場合は API 呼び出しをスキップ
- **設定変更時**: 常に API 再呼び出しでデータ更新
- **タイムスタンプ表示**: 最終更新時刻をヘッダーに表示

#### 期間フィルタの特別処理

```javascript
// PBL Viewer では以下のフィルタを API 呼び出し時に除外
delete filtersWithoutPeriod.created_after;
delete filtersWithoutPeriod.created_before;
delete filtersWithoutPeriod.completed_after;
delete filtersWithoutPeriod.quarter;
```

#### フィルタ項目（11 種類）

1. **Service**: サービス名での絞り込み
2. **Milestone**: マイルストーンでの絞り込み
3. **Epic**: Epic/通常 Issue での絞り込み
4. **Title**: タイトル部分一致検索
5. **Point**: 最小値・最大値での範囲指定
6. **Kanban Status**: かんばんステータスでの絞り込み
7. **Assignee**: アサイニーでの絞り込み
8. **Quarter**: 四半期での絞り込み（表示のみ、API には送信されない）
9. **Created At**: 作成日の期間指定（フロントエンド表示のみ）
10. **Completed At**: 完了日の期間指定（フロントエンド表示のみ）
11. **State**: opened/closed での状態絞り込み

#### 表示設定

- **ページサイズ**: デフォルト 50 件
- **全件表示**: `allowShowAll={true}` で有効
- **初期状態**: `initialShowAll={true}` で全件表示開始

### 共通仕様

#### テンプレート除外

- **バックエンド**: `IssueService.get_analyzed_issues()` で自動除外
- **対象**: `kanban_status === "--テンプレート"` の Issue
- **適用範囲**: チャート生成、Issue リスト、検索結果すべて

#### フィルタリセット

- **Dashboard**: 詳細フィルタエリアで個別リセット
- **PBL Viewer**: 全フィルタ一括リセット + API 再呼び出し

#### エラーハンドリング

- **セッション期限切れ**: 401/403 エラー時に GitLab 設定画面表示
- **接続エラー**: エラーメッセージ表示 + 再試行ボタン

## Issue ラベル規則

GitLab Bud Chart は以下のラベル規則に基づいて Issue を自動分析します：

### ポイント設定

- `p:1.0`, `p:2.5`, `p:5.0` - ストーリーポイント
- 例: `p:3.0` = 3.0 ポイント

### Kanban ステータス

- `#作業中` - 進行中のタスク
- `#完了` - 完了したタスク
- `#レビュー中` - レビュー待ち
- `#--テンプレート` - テンプレート

### サービス分類

- `s:backend` - バックエンド関連
- `s:frontend` - フロントエンド関連
- `s:infrastructure` - インフラ関連

### 四半期分類

- `@FY25Q1` - 2025 年度第 1 四半期
- `@FY25Q2` - 2025 年度第 2 四半期

### エピック

- `epic`

## 設計

- [プロンプト](/docs/develop/prompt.md)

![](/docs/develop/specs/rough_design.excalidraw.png)

# 以下、claude がつくったもの

## 機能

- **GitLab 連携**: Self-hosted GitLab からの issue 取得
- **Issue 分析**: ラベルベースの自動分析（point, kanban_status, service, quarter）
- **Burn-up/Burn-down チャート**: プロジェクト進捗可視化
- **Product Backlog 管理**: Issue 一覧表示・フィルタ・検索
- **統計分析**: 完了率、ベロシティ等の統計情報

## 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Backend**: Python + FastAPI
- **Testing**: Playwright (E2E) + pytest (Backend) + Vitest (Frontend)
- **Charts**: Recharts
- **Styling**: CSS3 + Responsive Design

## セットアップ

### 前提条件

- Node.js 18+
- Python 3.8+
- GitLab Personal Access Token

### インストール

```bash
# リポジトリクローン
git clone <repository-url>
cd gitlab-bud-chart

# Backend セットアップ
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend セットアップ
cd ../frontend
npm install
```

### 起動

```bash
# Backend起動
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Frontend起動（別ターミナル）
cd frontend
npm run dev
```

アプリケーションは http://localhost:3000 でアクセス可能です。

### GitLab 設定

1. GitLab Personal Access Token を作成

   - GitLab > Settings > Access Tokens
   - 権限: `api`, `read_repository`, `read_user`

2. アプリケーションで GitLab 設定

   - GitLab URL: `http://your-gitlab-url`
   - Access Token: 作成したトークン
   - Project ID: 対象プロジェクトの ID

3. Issue 分析用ラベル設定（詳細は `docs/develop/specs/issue_rules.md` 参照）

## 開発

### ディレクトリ構造

```
├── backend/          # Python FastAPI
│   ├── app/
│   │   ├── api/      # API エンドポイント
│   │   ├── models/   # データモデル
│   │   ├── services/ # ビジネスロジック
│   │   └── tests/    # テスト
│   └── requirements.txt
├── frontend/         # React TypeScript
│   ├── src/
│   │   ├── components/ # UIコンポーネント
│   │   ├── hooks/      # カスタムフック
│   │   ├── services/   # API呼び出し
│   │   └── types/      # 型定義
│   └── tests/        # E2Eテスト
├── docs/             # ドキュメント
└── scripts/          # スクリプト
```

### テスト実行

```bash
# 全テスト実行
./scripts/final-verification.sh

# Backend テスト
cd backend
source venv/bin/activate
pytest tests/ -v --cov=app

# Frontend E2E テスト
cd frontend
npx playwright test
```

### API エンドポイント

#### GitLab Connection

- `POST /api/gitlab/connect` - GitLab 接続設定
- `GET /api/gitlab/status` - 接続状態確認

#### Issues

- `GET /api/issues` - Issue 一覧取得
- `GET /api/issues/{id}` - Issue 詳細取得
- `GET /api/issues/analyzed` - 分析済み Issue 取得
- `GET /api/issues/statistics` - Issue 統計情報

#### Charts

- `GET /api/charts/burn-down` - Burn-down チャートデータ
- `GET /api/charts/burn-up` - Burn-up チャートデータ
- `GET /api/charts/velocity` - ベロシティデータ

詳細な API ドキュメントは http://localhost:8000/docs で確認できます。

## パフォーマンス

### 最適化機能

- **Backend**: キャッシュ機能、並列処理、メモリ最適化
- **Frontend**: 仮想化、メモ化、遅延読み込み
- **Charts**: データ点数制限、効率的な描画

### 性能要件

- 1000 件 Issue 処理: < 10 秒
- チャート描画: < 3 秒
- UI 応答性: < 1 秒

## デプロイ

### Docker（推奨）

```bash
# Backend
cd backend
docker build -t gitlab-bud-chart-backend .
docker run -p 8000:8000 gitlab-bud-chart-backend

# Frontend
cd frontend
docker build -t gitlab-bud-chart-frontend .
docker run -p 3000:3000 gitlab-bud-chart-frontend
```

### 手動デプロイ

```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

## トラブルシューティング

### よくある問題

**GitLab 接続エラー**

- Access Token の権限確認
- GitLab URL の正確性確認
- ネットワーク接続確認

**チャート表示されない**

- Issue にポイントラベルが設定されているか確認
- 期間選択が適切か確認
- ブラウザのコンソールエラー確認

**パフォーマンス問題**

- 大量データの場合は期間を絞る
- ブラウザのキャッシュクリア
- メモリ使用量確認

### ログ確認

```bash
# Backend ログ
tail -f backend/logs/app.log

# Frontend ログ
ブラウザの開発者ツール > Console
```

## 貢献

1. Issue で課題・機能要望を作成
2. フィーチャーブランチで開発
3. テスト実行・確認
4. Pull Request 作成
5. レビュー後マージ

### 開発ガイドライン

- TypeScript 型安全性の維持
- テストカバレッジ 80%以上
- ESLint/Prettier 設定に従う
- セキュリティ要件の遵守

## ライセンス

MIT License

## サポート

- Issue 報告: GitHub Issues
- ドキュメント: `docs/` ディレクトリ
- 開発者向け: `docs/develop/` ディレクトリ

---

**🎉 GitLab Bud Chart で効率的なプロジェクト管理を！**

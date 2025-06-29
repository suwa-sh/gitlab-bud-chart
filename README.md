# GitLab Bud Chart

GitLabのissueを分析し、burn-up/burn-downチャート表示とproduct backlog表示を行うWebアプリケーション。

## 動作イメージ

| ![](/docs/images/dashboard.png) | ![](/docs/images/pbl-viewer.png) |
| ------------------------------- | -------------------------------- |

## 機能

- **GitLab連携**: Self-hosted GitLabからのissue取得
- **Issue分析**: ラベルベースの自動分析（point, kanban_status, service, quarter）
- **Burn-up/Burn-downチャート**: プロジェクト進捗可視化
- **Product Backlog管理**: Issue一覧表示・フィルタ・検索
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

アプリケーションは http://localhost:3002 でアクセス可能です。

### GitLab設定

1. GitLab Personal Access Tokenを作成
   - GitLab > Settings > Access Tokens
   - 権限: `api`, `read_repository`, `read_user`

2. アプリケーションでGitLab設定
   - GitLab URL: `http://your-gitlab-url`
   - Access Token: 作成したトークン
   - Project ID: 対象プロジェクトのID

3. Issue分析用ラベル設定（詳細は `docs/develop/specs/issue_rules.md` 参照）

## Issue ラベル規則

GitLab Bud Chartは以下のラベル規則に基づいてIssueを自動分析します：

### ポイント設定
- `p:1.0`, `p:2.5`, `p:5.0` - ストーリーポイント
- 例: `p:3.0` = 3.0ポイント

### Kanbanステータス
- `#作業中` - 進行中のタスク
- `#完了` - 完了したタスク
- `#レビュー中` - レビュー待ち

### サービス分類
- `s:backend` - バックエンド関連
- `s:frontend` - フロントエンド関連
- `s:infrastructure` - インフラ関連

### 四半期分類
- `@FY2501Q1` - 2025年度第1四半期
- `@FY2501Q2` - 2025年度第2四半期

## 画面構成

### Dashboard
- プロジェクト全体の進捗状況
- Burn-up/Burn-downチャート
- 期間選択・フィルタリング
- 統計情報表示

### PBL Viewer
- Product Backlog一覧
- 詳細フィルタ・検索
- Issue詳細表示
- CSV エクスポート

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
- `POST /api/gitlab/connect` - GitLab接続設定
- `GET /api/gitlab/status` - 接続状態確認

#### Issues
- `GET /api/issues` - Issue一覧取得
- `GET /api/issues/{id}` - Issue詳細取得
- `GET /api/issues/analyzed` - 分析済みIssue取得
- `GET /api/issues/statistics` - Issue統計情報

#### Charts
- `GET /api/charts/burn-down` - Burn-downチャートデータ
- `GET /api/charts/burn-up` - Burn-upチャートデータ
- `GET /api/charts/velocity` - ベロシティデータ

詳細なAPIドキュメントは http://localhost:8000/docs で確認できます。

## パフォーマンス

### 最適化機能
- **Backend**: キャッシュ機能、並列処理、メモリ最適化
- **Frontend**: 仮想化、メモ化、遅延読み込み
- **Charts**: データ点数制限、効率的な描画

### 性能要件
- 1000件Issue処理: < 10秒
- チャート描画: < 3秒
- UI応答性: < 1秒

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
docker run -p 3002:3002 gitlab-bud-chart-frontend
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

**GitLab接続エラー**
- Access Tokenの権限確認
- GitLab URLの正確性確認
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

1. Issueで課題・機能要望を作成
2. フィーチャーブランチで開発
3. テスト実行・確認
4. Pull Request作成
5. レビュー後マージ

### 開発ガイドライン
- TypeScript型安全性の維持
- テストカバレッジ80%以上
- ESLint/Prettier設定に従う
- セキュリティ要件の遵守

## 設計

![](/docs/develop/specs/rough_design.excalidraw.png)

## ライセンス

MIT License

## サポート

- Issue報告: GitHub Issues
- ドキュメント: `docs/` ディレクトリ
- 開発者向け: `docs/develop/` ディレクトリ

---

**🎉 GitLab Bud Chart で効率的なプロジェクト管理を！**

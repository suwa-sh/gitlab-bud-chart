# GitLab Issue分析Webアプリケーション 全体作業計画

## プロジェクト概要

### 目的
GitLabのissueを分析し、burn-up/burn-downチャート表示とproduct backlog表示を行うWebアプリケーション「gitlab-bud-chart」を開発する。

### アーキテクチャ
- **Frontend**: TypeScript + React
- **Backend**: Python + FastAPI
- **E2E Testing**: Playwright (headless + スクリーンショット)
- **GitLab**: Self-hosting想定

### 画面構成
画面レイアウト: `docs/develop/specs/rough_design.excalidraw.png`
- **Dashboard**: burn-up/burn-downチャート表示、期間選択、issue一覧表示
- **PBL Viewer**: Product backlog表示、issue詳細一覧

## 作業ルール

### 重要ルール
- **検証**: 作業実施後、検証項目を確認し、対応状況を更新する
- **ADR準拠**: コード作成前後にADRを確認し、方針に準拠していることを確認する
- **テスト**: 各作業終了前にテストコードがすべて正常終了することを確認する
- **インターフェース**: frontend/backendのインターフェースを常に確認する

### ドキュメント管理
- **言語**: 日本語ベース
- **図**: Mermaid形式
- **ADR**: `docs/develop/adr/` 下で管理
- **課題**: `docs/develop/issue/` 下で管理
- **調査**: `docs/investigation/` で調査結果・サンプル実装を保持

### テスト・品質管理
- **Playwright**: headless利用、スクリーンショットを毎回取得
- **技術調査**: 不明点は簡易的なサンプル実装を行ってから採用
- **機能追加**: 現時点では計画しない
- **CI/CD**: 今回の範囲外

## フェーズ別実装計画

### Phase 1: GitLab接続設定 (Task 01-03)

#### Task 01: プロジェクト基盤構築・ADR作成
- **目的**: プロジェクト構造設計・技術選定・ADR作成
- **成果物**:
  - プロジェクト構造設計書
  - ADR-001: アーキテクチャ設計
  - ADR-002: 技術スタック選定
  - 開発ディレクトリ構造作成
- **検証項目**:
  - ADRが要件に準拠している
  - プロジェクト構造が明確に定義されている

#### Task 02: 開発環境構築
- **目的**: FastAPI + React + TypeScript + Playwright環境構築
- **成果物**:
  - Backend基盤（FastAPI + Uvicorn）
  - Frontend基盤（React + TypeScript + Vite）
  - Playwright設定・基本テスト
  - 開発サーバー起動確認
- **検証項目**:
  - 両サーバーが正常起動する
  - Playwrightが正常動作する
  - 基本的なHTTP通信が確認できる

#### Task 03: GitLab API接続設定・基本テスト
- **目的**: GitLab API接続・認証設定・基本動作確認
- **成果物**:
  - GitLab API接続設定
  - 認証機能実装
  - 基本API呼び出しテスト
  - Playwright E2Eテスト (Phase 1完了)
- **検証項目**:
  - GitLab APIに正常接続できる
  - 認証が正常に動作する
  - E2Eテストが全て通る

### Phase 2: GitLab issue取得 (Task 04-06)

#### Task 04: GitLab API統合・issue取得ロジック
- **目的**: GitLab APIからissue取得機能実装
- **成果物**:
  - Issue取得API実装
  - エラーハンドリング
  - ページネーション対応
  - 単体テスト
- **検証項目**:
  - 大量issueが正常取得できる
  - エラー時の処理が適切
  - パフォーマンスが許容範囲

#### Task 05: Issue分析ロジック実装
- **目的**: issue_rules.mdに従ったラベル解析・データ変換
- **成果物**:
  - ラベル解析ロジック（point, kanban_status, service, quarter）
  - データ変換機能
  - バリデーション機能
  - 単体テスト
- **検証項目**:
  - ラベル解析が正確
  - データ変換が要件通り
  - 不正データの処理が適切

#### Task 06: Backend API実装・データ変換
- **目的**: Frontend向けAPI実装・データ変換完成
- **成果物**:
  - Issues一覧API
  - Issue詳細API
  - フィルタ・検索API
  - Playwright E2Eテスト (Phase 2完了)
- **検証項目**:
  - API仕様が明確に定義されている
  - レスポンス形式が統一されている
  - E2Eテストが全て通る

### Phase 3: Issue一覧表示 (Task 07-09)

#### Task 07: React Frontend基盤構築
- **目的**: React基盤・ルーティング・状態管理設定
- **成果物**:
  - React Router設定
  - 状態管理（Context API or Redux Toolkit）
  - 基本コンポーネント構造
  - TypeScript型定義
- **検証項目**:
  - ルーティングが正常動作
  - 状態管理が適切に実装されている
  - TypeScript型安全性が確保されている

#### Task 08: Issue一覧表示UI実装
- **目的**: rough_design.excalidraw.png準拠のUI実装
- **成果物**:
  - Dashboard/PBL Viewerタブ実装
  - Issue一覧テーブル
  - GitLab Config設定UI
  - レスポンシブ対応
- **検証項目**:
  - デザインが仕様通り
  - UI操作が直感的
  - 各デバイスで適切に表示される

#### Task 09: 検索・フィルタ機能・Frontend-Backend統合
- **目的**: 検索・フィルタ機能・完全なデータ連携
- **成果物**:
  - 検索機能（title, assignee等）
  - フィルタ機能（milestone, kanban_status等）
  - ソート機能
  - Playwright E2Eテスト (Phase 3完了)
- **検証項目**:
  - 検索・フィルタが期待通り動作
  - Frontend-Backend連携が正常
  - E2Eテストが全て通る

### Phase 4: Issue分析・チャート表示 (Task 10-12)

#### Task 10: Burn-up/Burn-downチャート分析ロジック
- **目的**: チャート用データ分析・集計ロジック実装
- **成果物**:
  - Burn-downチャート計算ロジック
  - Burn-upチャート計算ロジック
  - 期間指定・milestone対応
  - チャートデータAPI
- **検証項目**:
  - チャート計算が正確
  - 期間指定が正常動作
  - データが可視化に適した形式

#### Task 11: Dashboard UI・チャート表示コンポーネント
- **目的**: チャート表示・Dashboard UI完成
- **成果物**:
  - Burn-up/Burn-downチャートコンポーネント
  - 期間選択UI
  - チャート・テーブル連携
  - インタラクティブ機能
- **検証項目**:
  - チャートが美しく表示される
  - インタラクションが直感的
  - データが正確に反映される

#### Task 12: 全体統合・最終E2Eテスト・完了
- **目的**: 全機能統合・パフォーマンス最適化・最終検証
- **成果物**:
  - 全機能統合テスト
  - パフォーマンス最適化
  - 完全なPlaywright E2Eテストスイート
  - 最終ドキュメント整備
- **検証項目**:
  - 全機能が要件通り動作
  - パフォーマンスが許容範囲
  - E2Eテストが全て通る
  - ドキュメントが完備されている

## 成果物管理

### 各タスクの標準成果物
- **実装コード**: 機能実装・テストコード
- **ADR**: 技術的意思決定記録
- **検証レポート**: 実施内容・結果・課題
- **Playwrightスクリーンショット**: 動作確認証跡

### ディレクトリ構造
```
docs/
├── develop/
│   ├── plan.md (このファイル)
│   ├── adr/
│   │   ├── 001-architecture.md
│   │   ├── 002-tech-stack.md
│   │   └── ...
│   ├── issue/
│   │   └── {作業時の課題管理}
│   ├── tasks/
│   │   ├── task-01-setup.md
│   │   ├── task-02-environment.md
│   │   └── ...
│   └── specs/
│       ├── rough_design.excalidraw.png
│       └── issue_rules.md
├── investigation/
│   ├── sample/
│   └── {調査結果}
backend/
├── app/
├── tests/
└── ...
frontend/
├── src/
├── tests/
└── ...
```

## 品質保証

### 各フェーズ完了条件
1. **Phase 1**: GitLab API接続確認・基本E2Eテスト通過
2. **Phase 2**: Issue取得・分析機能完成・API E2Eテスト通過  
3. **Phase 3**: UI表示・検索フィルタ完成・フロントエンドE2Eテスト通過
4. **Phase 4**: チャート表示・全機能統合・完全E2Eテスト通過

### 継続的検証
- 各タスク完了時: ADR準拠確認・テスト実行・インターフェース確認
- フェーズ完了時: Playwright E2Eテスト全件実行・スクリーンショット取得
- 最終完了時: 全体機能・パフォーマンス・ドキュメント検証

この計画に従って、確実で高品質なWebアプリケーションを構築します。
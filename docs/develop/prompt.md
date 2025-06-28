# 方針

- 既存コードベースに claude 任せで実装を続けたところ、完成しなそうなのでシンプルに作り直す。

# 計画

```
gitlab の issue を分析し、burn-up/burn-down チャート表示＆product backlog 表示を行う web アプリケーション

- 段階的に考えて
- 作業計画とルールを docs/develop/plan.md に整理したい
- claude code に渡す作業単位で docs/develop/tasks/task-{00}-{taskname}.md として作成したい
- use context7
- 作業ルール
  - *重要* 作業実施後、検証項目を確認し、対応状況を更新する
  - *重要* コード作成前後に ADR を確認し、方針に準拠していることを確認する
  - *重要* 各作業終了前にテストコードがすべて正常終了することを確認する
  - *重要* frontend/backendのインターフェースを常に確認する
  - ドキュメントは日本語ベースで管理
  - ドキュメント内の図の描画は Mermaid 形式
  - 技術的な不明点は、簡易的なサンプル実装をおこなってから採用
  - docs/develop/adr 下で、 adrを管理する
  - docs/develop/issue 下で、作業実施時の課題を管理する
  - 調査結果(docs/investigation)、サンプル実装(docs/investigation/sample)などもリポジトリに保持
  - 機能追加などは現時点で計画しない
  - playwright を headless で利用。スクリーンショットは毎回取る
  - CI/CD は今回の範囲外
  - 接続先のgitlabは self-hosting を想定
  - 作業は大まかに以下の順とし、各段階でplaywrightのe2eテストを完了させる
    - 1. gitlab接続設定
    - 2. gitlabからのissue取得
    - 3. issue一覧表示
    - 4. issueを分析し、チャート表示
- プロジェクト名は gitlab-bud-chart
  - frontend
    - ts,react
    - 画面レイアウトは、 @docs/develop/specs/rough_design.excalidraw.png
    - chart 表示 burn-up, burn-down
    - gitlab issue のリスト表示。条件で検索・フィルタ
    - ログインなどは不要
  - backend
    - python,fastapi
    - @docs/develop/specs/issue_rules.md
    - gitlab から issue 取得
    - 取得した issue を分析し、burn-up, burn-down チャート用にデータ集計
```

# 実施

```
│ > @docs/develop/tasks/task-01-setup.md の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-02-environment.md  の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > cssが適用されていないようです。playwrightでコンソールとスクリーンショットを確認し、修正してください。
│ > .gitignore整備
│ > @docs/develop/tasks/task-03-gitlab-connection.md  の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-04-gitlab-api-integration.md  の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-05-issue-analysis.md   の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > Quarter形式誤り @FY2501Q1ではなく、@FY25Q1。関連コードと資料を更新してください
│ > @docs/develop/tasks/task-06-backend-api.md  の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docker/docker-compose.gitlab.yml でgitlab起動済み。http://localhost:8080 で起動中。テストデータを当該gitlabに登録し、 e2eテストを実施してください
│ > @docs/develop/tasks/task-07-frontend-setup.md   の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-08-issue-list-ui.md の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-09-search-filter.md  の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > e2eテストを実施してください
│ > @docs/develop/tasks/task-10-chart-analysis.md の作業を実施後、検証項目を確認し、対応状況を更新してください
```

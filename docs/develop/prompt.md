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
│ > @docs/develop/tasks/task-11-dashboard-chart-ui.md の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > @docs/develop/tasks/task-12-integration.md の作業を実施後、検証項目を確認し、対応状況を更新してください
│ > e2eテストの接続情報は @/workspace/test_config.json の情報を利用してください。playwrightのコンソールの確認を行い、スクリーンショットも確認してください。
│ > テスト用のGitLabインスタンスは起動しています。コマンドの結果を参考に、テストコードを見直してください。
│ > test-chartプロジェクトにissue1〜issue20のデータを登録し、burn-down,burn-up,issueリスト,pbl-viewerの動作を確認するe2eテストを作成し、実行してください。playwrightのコンソールの確認を行い、スクリーンショットも確認してください。
│ > pbl-viewerのセッション管理の課題を解消してください。playwrightのコンソールの確認を行い、スクリーンショットも確認してください。
│ > frontend/Dockerfile, backend/Dockerfile を整備し、 docker/docker-compose.yml に、forntendとbackendの起動設定を作成してください
```

# 整備

- gitlab の selfhosting は、古いバージョンの api しか対応していない可能性あり

```
│ > gitlabのapi_versionをfrontendのgitlab接続設定で指定したい。デフォルトは4
```

- gitlab 接続先は初回のみとなっているが、変更可能としたい。また、ID 数値のみでの指定は面倒なので、一覧からの選択を可能とする

```
│ > gitlab接続設定を変更できるようにしたい。また、対象プロジェクトはidではなくプロジェクト名でも指定可能としたい。また、有効なurlとtokenが指定されている場合、プロジェクト名は一覧からの選択も可能としたい。修正完了後、playwrightのコンソールの確認を行い、スクリーンショットも確認してください。
```

- フィルタが動作していない

```
│ > issueフィルタのstate:openedを選択してもフィルタリングされない。類似含め修正完了後、playwrightのコンソールの確認を行い、スクリーンショットも確認してください。
```

- dashboard の chart と issue の表示対象を合致させる

```
│ > dashboardのburndown/burnupの表示対象期間で、issuesの表示対象をフィルタしてください
│ > デフォルトの表示期間は 今四半期 とし、カスタムの期間も今四半期の日付としてください。
│ > dashboardのissues表示条件は、quaterが表示期間に含まれていること。 例) 2025-06-30 〜 2025-07-01 の場合、 '@FY25Q2' と '@FY25Q3' の
│ > dashboardのissuesとpbl-viewerの表示項目Created Atの前にQuarterを追加する
│ > burndown/burnupチャートの理想線は、日本の休日（土日祝）はポイント消化を0とする。祝日の判定は、holiday_jpを利用する。
```

- issue リンク

```
│ > dashboardのissuesとpbl-viewerの Titleのリンクは、gitlabのフルパスURLとしてください 例) http://localhost:8080/root/test-project/-/issues/8
```

- docker イメージ

```
ghcr で @docker/docker-compose.yml で自己ビルドする docker イメージを管理したい
```

- proxy 経由の考慮と issue が無い場合の表示調整

```
│ > エラーの原因と対策案は？Burn-upチャートAPI失敗: division by zero
│ > gitlabがproxy経由の場合もあるため、configで指定したい
│ > frontendでもproxyの指定を可能としたい
│ > frontendの Dashboard "Gitlab Configuration" でもgitlabアクセス用のproxy指定したい
```

- reverse proxy

```
│ > @docker/docker-compose.yml構成でリバースプロキシを用意し、外部からは１ポートのみでアクセス可能とする。また、VITE_環境変数については、実行時に適用されるようにしたい。
│ > CORSの考慮もしてください
│ > @docker/docker-compose.local.yml も @docker/docker-compose.yml 同様リバースプロキシ対応してください
```

- issue 一覧に表示されない＆動作不具合解消
  - 手作業で docker-compose.yml に `pull_policy: always` 追加し、起動ごとに最新イメージ取得が行われるようにした

```
│ > gitlab設定変更直後、Issuesの内容がgitlab設定変更前の状態のままとなっている。
│ > @docs/develop/sample で、ラベル解析とデータ変換のルールをdocs/sample_label_rule.mdにまとめて
│ > issue一覧のtitleリンクはiidを利用
│ > dashboardの issue一覧のtitleリンクが http://192.168.0.105:8080/root/test-project/-/issues/undefined となっている。
```

- 表示の brushup

```
│ > Dashboardのgitlab接続済み ラベルにリポジトリの情報も表示したい。また、接続状態の表示をコンパクトにしたい。
│ > projectNameを表示。リンク先を gitlabのURL + projectNamespace とする
│ > 接続設定は、PBL viewerのようにタイトルの右側に表示したい
│ > Dashboardのチャートの表示はissue一覧と同じようなレイアウトで、タイトル、表示条件、エクスポート、フィルタ のように統一感を出してください
│ > 表示期間選択のカスタムボタンと具体的な表示期間を１まとめにしたい
```

- session 管理

```
│ > ブラウザごと（通常/シークレットモード）にgitlabアクセスを別々に管理したい。backend側でセッション情報を管理する場合はインメモリで管理し、１週間アクセスがなければタイムアウト。ローカルネットワークでの少人数利用のため、セキュリティ考慮は今回不要。
```

- テストデータ生成関連整理

  - mac で動作するよう調整。
  - token 生成と、テスト issue 生成を動くようにした。

- pbl-viewer

```
│ > pbl-viewerは、issueの全量を表示
```

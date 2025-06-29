# GitLab Bud Chart API Documentation

## Base URL
`http://localhost:8000`

## Interactive Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Health Check
#### GET /health
アプリケーションの動作状態を確認します。

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-28T12:00:00.000Z"
}
```

### GitLab Connection

#### POST /api/gitlab/connect
GitLab接続を設定します。

**Request Body:**
```json
{
  "gitlab_url": "http://your-gitlab-url",
  "gitlab_token": "glpat-xxxxxxxxxxxxxxxxxxxx", 
  "project_id": "1"
}
```

**Response:**
```json
{
  "status": "connected",
  "message": "GitLab接続が正常に設定されました",
  "project_info": {
    "id": 1,
    "name": "project-name",
    "url": "http://gitlab-url/project"
  }
}
```

#### GET /api/gitlab/status
GitLab接続状態を確認します。

**Response:**
```json
{
  "is_connected": true,
  "gitlab_url": "http://your-gitlab-url",
  "project_id": "1",
  "project_name": "project-name",
  "last_connected": "2024-12-28T12:00:00.000Z"
}
```

#### GET /api/gitlab/issues/sample
GitLabからサンプルIssueを取得します（接続テスト用）。

**Response:**
```json
{
  "sample_issues": [
    {
      "id": 1,
      "title": "Sample Issue",
      "state": "opened",
      "labels": ["p:3.0", "#作業中", "s:backend"]
    }
  ],
  "total_count": 50
}
```

### Issues

#### GET /api/issues
Issue一覧を取得します。

**Query Parameters:**
- `milestone` (string): マイルストーンでフィルタ
- `assignee` (string): 担当者でフィルタ
- `state` (string): 状態でフィルタ（opened, closed）
- `kanban_status` (string): Kanbanステータスでフィルタ
- `service` (string): サービスでフィルタ
- `search` (string): 検索キーワード
- `min_point` (number): 最小ポイント
- `max_point` (number): 最大ポイント
- `quarter` (string): 四半期でフィルタ
- `created_after` (string): 作成日開始
- `created_before` (string): 作成日終了
- `completed_after` (string): 完了日開始
- `page` (number): ページ番号（デフォルト: 1）
- `per_page` (number): ページサイズ（デフォルト: 50）
- `sort_by` (string): ソート項目
- `sort_order` (string): ソート順（asc, desc）

**Response:**
```json
{
  "issues": [
    {
      "id": 1,
      "title": "Issue Title",
      "description": "Issue description",
      "state": "opened",
      "labels": ["p:3.0", "#作業中", "s:backend"],
      "milestone": "v1.0",
      "assignee": "user1",
      "created_at": "2024-12-01T00:00:00.000Z",
      "updated_at": "2024-12-28T12:00:00.000Z",
      "closed_at": null,
      "story_points": 3.0,
      "kanban_status": "#作業中",
      "service": "s:backend",
      "quarter": "@FY2501Q1"
    }
  ],
  "total_count": 100,
  "page": 1,
  "per_page": 50,
  "total_pages": 2
}
```

#### GET /api/issues/{id}
特定のIssue詳細を取得します。

**Path Parameters:**
- `id` (integer): Issue ID

**Response:**
```json
{
  "id": 1,
  "title": "Issue Title",
  "description": "Detailed description...",
  "state": "opened",
  "labels": ["p:3.0", "#作業中", "s:backend"],
  "milestone": "v1.0",
  "assignee": "user1",
  "created_at": "2024-12-01T00:00:00.000Z",
  "updated_at": "2024-12-28T12:00:00.000Z",
  "closed_at": null,
  "story_points": 3.0,
  "kanban_status": "#作業中", 
  "service": "s:backend",
  "quarter": "@FY2501Q1",
  "web_url": "http://gitlab/issues/1"
}
```

#### POST /api/issues/search
Issue検索を実行します。

**Request Body:**
```json
{
  "query": "検索キーワード",
  "milestone": "v1.0",
  "assignee": "user1",
  "state": "opened",
  "kanban_status": "#作業中",
  "service": "s:backend",
  "min_point": 1.0,
  "max_point": 5.0,
  "quarter": "@FY2501Q1",
  "page": 1,
  "per_page": 50
}
```

**Response:** Issue一覧と同じ形式

#### GET /api/issues/analyzed
分析済みIssue一覧を取得します。

**Query Parameters:** Issue一覧と同じ

**Response:**
```json
{
  "issues": [...],
  "analysis_summary": {
    "total_issues": 100,
    "issues_with_points": 85,
    "issues_with_status": 90,
    "issues_with_service": 80,
    "analysis_coverage": 85.0
  },
  "total_count": 100
}
```

#### GET /api/issues/statistics
Issue統計情報を取得します。

**Query Parameters:**
- フィルタ系パラメータ（Issue一覧と同じ）

**Response:**
```json
{
  "total_issues": 100,
  "by_state": {
    "opened": 60,
    "closed": 40
  },
  "by_kanban_status": {
    "#作業中": 30,
    "#完了": 40,
    "#レビュー中": 15,
    "未設定": 15
  },
  "by_service": {
    "s:backend": 35,
    "s:frontend": 30,
    "s:infrastructure": 20,
    "未設定": 15
  },
  "by_assignee": {
    "user1": 25,
    "user2": 20,
    "未割当": 55
  },
  "points_statistics": {
    "total_points": 250.0,
    "completed_points": 120.0,
    "average_points": 2.5,
    "completion_rate": 48.0
  },
  "velocity_data": {
    "last_4_weeks": 25.0,
    "average_weekly": 6.25
  }
}
```

#### GET /api/issues/validation
Issue データ品質検証を実行します。

**Response:**
```json
{
  "validation_results": {
    "total_issues": 100,
    "issues_with_errors": 15,
    "error_rate": 15.0
  },
  "errors": [
    {
      "issue_id": 1,
      "error_type": "missing_points",
      "message": "ストーリーポイントが設定されていません"
    },
    {
      "issue_id": 2,
      "error_type": "invalid_label_format",
      "message": "ラベル形式が正しくありません: p:invalid"
    }
  ],
  "recommendations": [
    "15件のIssueにストーリーポイントを設定してください",
    "5件のIssueのラベル形式を修正してください"
  ]
}
```

#### GET /api/issues/export/{format}
Issue一覧をエクスポートします。

**Path Parameters:**
- `format` (string): エクスポート形式（csv, json）

**Query Parameters:** Issue一覧と同じフィルタ

**Response:** ファイルダウンロード（CSV/JSON）

### Charts

#### GET /api/charts/burn-down
Burn-downチャートデータを取得します。

**Query Parameters:**
- `start_date` (string): 開始日（YYYY-MM-DD形式）
- `end_date` (string): 終了日（YYYY-MM-DD形式）
- `milestone` (string, optional): マイルストーンでフィルタ

**Response:**
```json
{
  "chart_data": [
    {
      "date": "2024-12-01",
      "planned_points": 100.0,
      "actual_points": 100.0,
      "remaining_points": 100.0,
      "completed_points": 0.0,
      "total_points": 100.0
    },
    {
      "date": "2024-12-02",
      "planned_points": 85.7,
      "actual_points": 85.0,
      "remaining_points": 85.0,
      "completed_points": 15.0,
      "total_points": 100.0
    }
  ],
  "metadata": {
    "period": {
      "start_date": "2024-12-01",
      "end_date": "2024-12-07"
    },
    "milestone": "v1.0",
    "total_days": 7
  },
  "statistics": {
    "initial_points": 100.0,
    "final_points": 30.0,
    "completion_rate": 70.0,
    "days_ahead_behind": -1
  }
}
```

#### GET /api/charts/burn-up
Burn-upチャートデータを取得します。

**Query Parameters:** Burn-downチャートと同じ

**Response:**
```json
{
  "chart_data": [
    {
      "date": "2024-12-01", 
      "planned_points": 0.0,
      "actual_points": 0.0,
      "remaining_points": 100.0,
      "completed_points": 0.0,
      "total_points": 100.0
    },
    {
      "date": "2024-12-02",
      "planned_points": 14.3,
      "actual_points": 15.0,
      "remaining_points": 85.0,
      "completed_points": 15.0,
      "total_points": 100.0
    }
  ],
  "metadata": {
    "period": {
      "start_date": "2024-12-01",
      "end_date": "2024-12-07"
    },
    "milestone": "v1.0",
    "scope_changes": []
  },
  "statistics": {
    "total_points": 100.0,
    "completed_points": 70.0,
    "completion_rate": 70.0,
    "velocity_trend": "increasing"
  }
}
```

#### GET /api/charts/velocity
ベロシティデータを取得します。

**Query Parameters:**
- `weeks` (integer): 分析週数（デフォルト: 12）

**Response:**
```json
{
  "velocity_data": [
    {
      "week_start": "2024-11-04",
      "week_end": "2024-11-10", 
      "completed_points": 25.0,
      "completed_issues": 8,
      "planned_points": 30.0
    },
    {
      "week_start": "2024-11-11",
      "week_end": "2024-11-17",
      "completed_points": 22.0,
      "completed_issues": 7,
      "planned_points": 25.0
    }
  ],
  "average_velocity": 23.5,
  "weeks_analyzed": 12,
  "velocity_trend": {
    "direction": "stable",
    "change_percentage": 2.1
  },
  "predictive_data": {
    "estimated_completion_date": "2025-01-15",
    "confidence_level": 85.0
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "無効なパラメータです",
  "error_code": "INVALID_PARAMETER",
  "field_errors": {
    "start_date": ["日付形式が正しくありません"]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "認証が必要です",
  "error_code": "AUTHENTICATION_REQUIRED"
}
```

### 404 Not Found
```json
{
  "detail": "リソースが見つかりません",
  "error_code": "RESOURCE_NOT_FOUND"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["query", "start_date"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "内部サーバーエラーが発生しました",
  "error_code": "INTERNAL_SERVER_ERROR",
  "request_id": "12345-67890"
}
```

## Rate Limiting

APIには以下のレート制限が適用されます：

- **一般API**: 100 requests/minute
- **エクスポートAPI**: 10 requests/minute
- **GitLab連携API**: 50 requests/minute

レート制限に達した場合は429ステータスコードが返されます。

## Authentication

現在の実装では認証は不要ですが、本番環境では以下の認証方式を推奨します：

- API Key認証
- JWT Token認証
- OAuth 2.0

## Caching

パフォーマンス向上のため、以下のデータがキャッシュされます：

- Issue一覧: 5分間
- チャートデータ: 10分間
- 統計情報: 15分間

キャッシュクリアが必要な場合は、サーバーを再起動してください。

## Best Practices

### 効率的なAPI利用

1. **ページネーション**: 大量データは適切なページサイズで取得
2. **フィルタ活用**: 必要なデータのみ取得
3. **キャッシュ活用**: 同じデータの重複取得を避ける
4. **バッチ処理**: 複数データの一括処理

### エラーハンドリング

1. **適切なエラーコード確認**
2. **リトライ機能実装**（5xx エラーの場合）
3. **ユーザーフレンドリーなエラーメッセージ表示**

---

詳細な実装例やSDKについては、プロジェクトの`examples/`ディレクトリを参照してください。
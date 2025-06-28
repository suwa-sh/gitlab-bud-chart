# ADR-003: データモデル設計

## 決定事項

gitlab-bud-chartプロジェクトのデータモデルとして、GitLab Issueベースの分析データモデルと、チャート表示用の集計データモデルを定義する。issue_rules.mdに準拠したラベル分析機能を実装し、Burn-up/Burn-downチャート生成に最適化されたデータ構造を採用する。

## 根拠

### 1. 要件準拠性
- **issue_rules.md準拠**: GitLabラベルからのpoint、kanban_status、service、quarter抽出
- **チャート要件**: Burn-up/Burn-downチャート表示に必要なデータ構造
- **Product Backlog**: Issue一覧表示・検索・フィルタリング機能サポート

### 2. データ整合性
- **型安全性**: Pydanticによる厳密なデータバリデーション
- **変換ロジック**: GitLab APIレスポンスから分析用データへの明確な変換仕様
- **拡張性**: 将来的な分析項目追加を考慮した設計

### 3. パフォーマンス最適化
- **メモリ効率**: 必要最小限のデータ保持
- **計算効率**: チャートデータ事前計算による高速表示
- **キャッシュ戦略**: Issue取得結果の効率的キャッシュ

## 詳細な設計内容

### Core Domain Models

#### IssueModel (Issueエンティティ)
```python
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum

class IssueState(str, Enum):
    OPENED = "opened"
    CLOSED = "closed"

class KanbanStatus(str, Enum):
    TODO = "#TODO"
    IN_PROGRESS = "#作業中"
    REVIEW = "#レビュー中"
    COMPLETED = "#完了"
    BLOCKED = "#ブロック中"

class IssueModel(BaseModel):
    """GitLab Issueの基本情報とラベル分析結果"""
    
    # GitLab基本情報
    id: int = Field(..., description="GitLab Issue ID")
    iid: int = Field(..., description="Project内Issue番号")
    title: str = Field(..., description="Issue タイトル")
    description: Optional[str] = Field(None, description="Issue 説明文")
    state: IssueState = Field(..., description="Issue 状態")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")
    due_date: Optional[date] = Field(None, description="期限日")
    milestone: Optional[str] = Field(None, description="マイルストーン名")
    assignee: Optional[str] = Field(None, description="担当者")
    author: str = Field(..., description="作成者")
    web_url: str = Field(..., description="GitLab WebUI URL")
    
    # 生のラベル情報
    labels: List[str] = Field(default_factory=list, description="GitLabラベル一覧")
    
    # 分析済みラベル情報 (issue_rules.md準拠)
    point: Optional[float] = Field(None, description="ポイント値 (p:X.X)", ge=0)
    kanban_status: Optional[KanbanStatus] = Field(None, description="カンバン状態 (#xxxx)")
    service: Optional[str] = Field(None, description="サービス名 (s:xxxx)")
    quarter: Optional[str] = Field(None, description="四半期 (@FYxxxx)")
    
    # 計算済み情報
    completed_at: Optional[date] = Field(None, description="完了日 (due_date由来)")
    is_completed: bool = Field(False, description="完了状態フラグ")
    
    @validator('point', pre=True, allow_reuse=True)
    def extract_point_from_labels(cls, v, values):
        """ラベルからポイント値を抽出 (p:1.0, p:2.5など)"""
        if v is not None:
            return v
        
        labels = values.get('labels', [])
        for label in labels:
            if label.startswith('p:'):
                try:
                    return float(label[2:])
                except ValueError:
                    continue
        return None
    
    @validator('kanban_status', pre=True, allow_reuse=True) 
    def extract_kanban_status_from_labels(cls, v, values):
        """ラベルからカンバン状態を抽出 (#作業中, #完了など)"""
        if v is not None:
            return v
            
        labels = values.get('labels', [])
        for label in labels:
            if label.startswith('#'):
                return label
        return None
    
    @validator('service', pre=True, allow_reuse=True)
    def extract_service_from_labels(cls, v, values):
        """ラベルからサービス名を抽出 (s:service-name)"""
        if v is not None:
            return v
            
        labels = values.get('labels', [])
        for label in labels:
            if label.startswith('s:'):
                return label[2:]
        return None
    
    @validator('quarter', pre=True, allow_reuse=True)
    def extract_quarter_from_labels(cls, v, values):
        """ラベルから四半期を抽出 (@FY2501, @FY2502など)"""
        if v is not None:
            return v
            
        labels = values.get('labels', [])
        for label in labels:
            if label.startswith('@'):
                return label[1:]
        return None
    
    @validator('completed_at', pre=True, allow_reuse=True)
    def set_completed_at_from_due_date(cls, v, values):
        """due_dateをcompleted_atとして設定"""
        if v is not None:
            return v
        return values.get('due_date')
    
    @validator('is_completed', pre=True, allow_reuse=True)
    def determine_completion_status(cls, v, values):
        """完了状態の判定 (kanban_status=#完了 または state=closed)"""
        if v is not None:
            return v
            
        # カンバン状態での判定
        kanban_status = values.get('kanban_status')
        if kanban_status == KanbanStatus.COMPLETED:
            return True
            
        # GitLab状態での判定
        state = values.get('state')
        if state == IssueState.CLOSED:
            return True
            
        return False

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat() if v else None
        }
```

#### ChartDataModel (チャートデータ)
```python
class ChartDataPoint(BaseModel):
    """チャートの単一データポイント"""
    
    date: date = Field(..., description="計測日")
    
    # Burn-downチャート用
    planned_points: float = Field(0.0, description="計画ポイント数", ge=0)
    remaining_points: float = Field(0.0, description="残りポイント数", ge=0)
    
    # Burn-upチャート用  
    completed_points: float = Field(0.0, description="完了ポイント数", ge=0)
    total_points: float = Field(0.0, description="総ポイント数", ge=0)
    
    # Issue数統計
    completed_issues: int = Field(0, description="完了Issue数", ge=0)
    total_issues: int = Field(0, description="総Issue数", ge=0)
    
    # 進捗率
    completion_rate: float = Field(0.0, description="完了率 (0.0-1.0)", ge=0, le=1.0)
    
    @validator('completion_rate', pre=False, always=True)
    def calculate_completion_rate(cls, v, values):
        """完了率の自動計算"""
        total_points = values.get('total_points', 0)
        if total_points > 0:
            completed_points = values.get('completed_points', 0)
            return min(completed_points / total_points, 1.0)
        return 0.0

class ChartDataModel(BaseModel):
    """期間別チャートデータ"""
    
    period_start: date = Field(..., description="期間開始日")
    period_end: date = Field(..., description="期間終了日")
    quarter: Optional[str] = Field(None, description="対象四半期")
    service: Optional[str] = Field(None, description="対象サービス")
    
    data_points: List[ChartDataPoint] = Field(
        default_factory=list, 
        description="時系列データポイント"
    )
    
    # 集計情報
    total_planned_points: float = Field(0.0, description="期間総計画ポイント")
    total_completed_points: float = Field(0.0, description="期間総完了ポイント")
    total_issues: int = Field(0, description="期間総Issue数")
    completed_issues: int = Field(0, description="期間完了Issue数")
    
    @validator('data_points', pre=False, always=True)
    def sort_data_points_by_date(cls, v):
        """データポイントを日付順でソート"""
        return sorted(v, key=lambda x: x.date)
```

### API Response Models

#### IssueListResponse
```python
class IssueFilterParams(BaseModel):
    """Issue一覧取得フィルタパラメータ"""
    
    quarter: Optional[str] = Field(None, description="四半期フィルタ")
    service: Optional[str] = Field(None, description="サービスフィルタ")
    kanban_status: Optional[KanbanStatus] = Field(None, description="カンバン状態フィルタ") 
    assignee: Optional[str] = Field(None, description="担当者フィルタ")
    milestone: Optional[str] = Field(None, description="マイルストーンフィルタ")
    state: Optional[IssueState] = Field(None, description="状態フィルタ")
    search: Optional[str] = Field(None, description="検索キーワード")
    
    # ページネーション
    page: int = Field(1, description="ページ番号", ge=1)
    per_page: int = Field(20, description="1ページあたり件数", ge=1, le=100)

class IssueListResponse(BaseModel):
    """Issue一覧レスポンス"""
    
    issues: List[IssueModel] = Field(..., description="Issue一覧")
    
    # ページネーション情報
    total_count: int = Field(..., description="総件数")
    page: int = Field(..., description="現在ページ")
    per_page: int = Field(..., description="1ページあたり件数")
    total_pages: int = Field(..., description="総ページ数")
    
    # フィルタ情報
    applied_filters: IssueFilterParams = Field(..., description="適用フィルタ")
    
    @validator('total_pages', pre=False, always=True)
    def calculate_total_pages(cls, v, values):
        """総ページ数の自動計算"""
        total_count = values.get('total_count', 0)
        per_page = values.get('per_page', 20)
        if per_page > 0:
            return (total_count + per_page - 1) // per_page
        return 0
```

#### ChartResponse Models
```python
class BurnDownChartResponse(BaseModel):
    """Burn-downチャートレスポンス"""
    
    chart_data: ChartDataModel = Field(..., description="チャートデータ")
    
    # 理想線データ
    ideal_line: List[ChartDataPoint] = Field(
        default_factory=list,
        description="理想的なburn-down線"
    )
    
    # 実績線データ  
    actual_line: List[ChartDataPoint] = Field(
        default_factory=list,
        description="実際のburn-down線"
    )

class BurnUpChartResponse(BaseModel):
    """Burn-upチャートレスポンス"""
    
    chart_data: ChartDataModel = Field(..., description="チャートデータ")
    
    # 累積完了ポイント線
    completed_line: List[ChartDataPoint] = Field(
        default_factory=list,
        description="完了ポイント累積線"
    )
    
    # 総ポイント線（変動可能）
    total_line: List[ChartDataPoint] = Field(
        default_factory=list,
        description="総ポイント線"
    )
```

### Data Transformation Logic

#### GitLab API → Domain Model変換
```python
class GitLabIssueTransformer:
    """GitLab API レスポンスからDomainモデルへの変換"""
    
    @staticmethod
    def transform_issue(gitlab_issue: dict) -> IssueModel:
        """GitLab Issue辞書からIssueModelへ変換"""
        
        # 基本情報の抽出
        base_data = {
            'id': gitlab_issue['id'],
            'iid': gitlab_issue['iid'], 
            'title': gitlab_issue['title'],
            'description': gitlab_issue.get('description'),
            'state': gitlab_issue['state'],
            'created_at': datetime.fromisoformat(
                gitlab_issue['created_at'].replace('Z', '+00:00')
            ),
            'updated_at': datetime.fromisoformat(
                gitlab_issue['updated_at'].replace('Z', '+00:00')
            ),
            'due_date': (
                date.fromisoformat(gitlab_issue['due_date']) 
                if gitlab_issue.get('due_date') else None
            ),
            'milestone': (
                gitlab_issue['milestone']['title'] 
                if gitlab_issue.get('milestone') else None
            ),
            'assignee': (
                gitlab_issue['assignee']['username']
                if gitlab_issue.get('assignee') else None
            ),
            'author': gitlab_issue['author']['username'],
            'web_url': gitlab_issue['web_url'],
            'labels': gitlab_issue.get('labels', [])
        }
        
        # Pydanticバリデーターによりラベル分析は自動実行
        return IssueModel(**base_data)
```

#### Chart Data生成ロジック
```python
class ChartDataGenerator:
    """Issue データからチャートデータ生成"""
    
    def generate_burn_down_data(
        self, 
        issues: List[IssueModel],
        start_date: date,
        end_date: date
    ) -> ChartDataModel:
        """Burn-downチャートデータ生成"""
        
        # 日付範囲の生成
        date_range = self._generate_date_range(start_date, end_date)
        
        # 初期総ポイント計算
        total_points = sum(issue.point or 0 for issue in issues)
        
        data_points = []
        for current_date in date_range:
            # 当日までに完了したポイント計算
            completed_points = sum(
                issue.point or 0 
                for issue in issues 
                if (issue.completed_at and issue.completed_at <= current_date)
                   or (issue.is_completed and issue.updated_at.date() <= current_date)
            )
            
            remaining_points = max(0, total_points - completed_points)
            
            data_points.append(ChartDataPoint(
                date=current_date,
                planned_points=total_points,
                remaining_points=remaining_points,
                completed_points=completed_points,
                total_points=total_points
            ))
        
        return ChartDataModel(
            period_start=start_date,
            period_end=end_date,
            data_points=data_points,
            total_planned_points=total_points,
            total_completed_points=data_points[-1].completed_points if data_points else 0,
            total_issues=len(issues),
            completed_issues=len([i for i in issues if i.is_completed])
        )
```

### Database Design (Cache Layer)

#### In-Memory Cache Structure
```python
from typing import Dict, Optional
from datetime import datetime, timedelta

class IssueCache:
    """Issue データのメモリキャッシュ"""
    
    def __init__(self, cache_ttl_minutes: int = 30):
        self._cache: Dict[str, dict] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self._cache_ttl = timedelta(minutes=cache_ttl_minutes)
    
    def get_cached_issues(
        self, 
        project_id: int,
        filters: Optional[IssueFilterParams] = None
    ) -> Optional[List[IssueModel]]:
        """キャッシュからIssue一覧取得"""
        cache_key = self._generate_cache_key(project_id, filters)
        
        if self._is_cache_valid(cache_key):
            cached_data = self._cache.get(cache_key)
            if cached_data:
                return [IssueModel(**issue) for issue in cached_data['issues']]
        
        return None
    
    def cache_issues(
        self,
        project_id: int, 
        issues: List[IssueModel],
        filters: Optional[IssueFilterParams] = None
    ) -> None:
        """Issue一覧をキャッシュに保存"""
        cache_key = self._generate_cache_key(project_id, filters)
        
        self._cache[cache_key] = {
            'issues': [issue.dict() for issue in issues],
            'cached_at': datetime.now()
        }
        self._cache_timestamps[cache_key] = datetime.now()
```

### バリデーション・制約

#### データ整合性制約
```python
class DataValidationRules:
    """データ整合性検証ルール"""
    
    @staticmethod
    def validate_chart_period(start_date: date, end_date: date) -> bool:
        """チャート期間の妥当性検証"""
        if start_date >= end_date:
            raise ValueError("開始日は終了日より前である必要があります")
        
        if (end_date - start_date).days > 365:
            raise ValueError("チャート期間は1年以内である必要があります")
        
        return True
    
    @staticmethod  
    def validate_issue_points(issues: List[IssueModel]) -> bool:
        """Issueポイントの妥当性検証"""
        for issue in issues:
            if issue.point is not None and issue.point < 0:
                raise ValueError(f"Issue {issue.id}: ポイントは0以上である必要があります")
        
        return True
```

### パフォーマンス最適化戦略

#### メモリ使用量最適化
- **Issue取得**: 必要フィールドのみ取得
- **キャッシュ管理**: TTLベースの自動削除
- **バッチ処理**: 大量データの分割処理

#### 計算効率最適化
- **事前計算**: チャートデータの段階的生成
- **インデックス化**: 日付・フィルタ条件による高速検索
- **差分更新**: 変更分のみの再計算

## 承認

- **決定日**: 2025-06-28
- **承認者**: Development Team  
- **レビュー予定**: Task 05 Issue分析実装時、Task 10 チャート分析実装時
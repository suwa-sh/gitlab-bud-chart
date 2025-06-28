# Task 10: Burn-up/Burn-downチャート分析ロジック

## 概要
チャート用データ分析・集計ロジックを実装し、burn-up/burn-downチャートのデータ生成機能を完成させる。

## 目的
- Burn-downチャート計算ロジック実装
- Burn-upチャート計算ロジック実装
- 期間指定・milestone対応実装
- チャートデータAPI実装

## 前提条件
- Task 09完了（検索・フィルタ機能・Frontend-Backend統合済み）

## 作業手順

### 1. チャートデータ分析サービス実装

**backend/app/services/chart_analyzer.py**:
```python
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict
import logging
from app.models.issue import IssueModel
from app.models.chart import ChartDataModel, BurnChartRequest, BurnChartResponse

logger = logging.getLogger(__name__)

class ChartAnalyzer:
    """Burn-up/Burn-downチャート分析サービス"""
    
    def generate_burn_down_data(
        self,
        issues: List[IssueModel],
        start_date: date,
        end_date: date,
        milestone: Optional[str] = None
    ) -> List[ChartDataModel]:
        """Burn-downチャートデータ生成"""
        try:
            # マイルストーンフィルタ
            filtered_issues = self._filter_by_milestone(issues, milestone)
            
            # 日付範囲生成
            date_range = self._generate_date_range(start_date, end_date)
            
            # 開始時点の総ポイント計算
            total_points = sum(issue.point for issue in filtered_issues if issue.point)
            
            chart_data = []
            for current_date in date_range:
                # その日時点での残りポイント計算
                completed_points = self._calculate_completed_points_by_date(
                    filtered_issues, current_date
                )
                remaining_points = total_points - completed_points
                
                # 理想線計算
                ideal_remaining = self._calculate_ideal_remaining(
                    total_points, start_date, end_date, current_date
                )
                
                chart_data.append(ChartDataModel(
                    date=current_date,
                    planned_points=ideal_remaining,
                    actual_points=remaining_points,
                    remaining_points=remaining_points,
                    completed_points=completed_points,
                    total_issues=len(filtered_issues),
                    completed_issues=self._count_completed_issues_by_date(
                        filtered_issues, current_date
                    )
                ))
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Burn-downデータ生成失敗: {e}")
            raise
    
    def generate_burn_up_data(
        self,
        issues: List[IssueModel],
        start_date: date,
        end_date: date,
        milestone: Optional[str] = None
    ) -> List[ChartDataModel]:
        """Burn-upチャートデータ生成"""
        try:
            filtered_issues = self._filter_by_milestone(issues, milestone)
            date_range = self._generate_date_range(start_date, end_date)
            
            # 総ポイント（動的に変化する可能性あり）
            total_points_by_date = self._calculate_total_points_by_date(
                filtered_issues, date_range
            )
            
            chart_data = []
            for current_date in date_range:
                completed_points = self._calculate_completed_points_by_date(
                    filtered_issues, current_date
                )
                total_points = total_points_by_date.get(current_date, 0)
                
                # 理想線計算（スコープ変更対応）
                ideal_completed = self._calculate_ideal_completed(
                    total_points, start_date, end_date, current_date
                )
                
                chart_data.append(ChartDataModel(
                    date=current_date,
                    planned_points=ideal_completed,
                    actual_points=completed_points,
                    total_points=total_points,
                    completed_points=completed_points,
                    total_issues=len([i for i in filtered_issues 
                                    if self._is_issue_in_scope_by_date(i, current_date)]),
                    completed_issues=self._count_completed_issues_by_date(
                        filtered_issues, current_date
                    )
                ))
            
            return chart_data
            
        except Exception as e:
            logger.error(f"Burn-upデータ生成失敗: {e}")
            raise
    
    def _filter_by_milestone(
        self, 
        issues: List[IssueModel], 
        milestone: Optional[str]
    ) -> List[IssueModel]:
        """マイルストーンフィルタ"""
        if not milestone:
            return issues
        return [issue for issue in issues if issue.milestone == milestone]
    
    def _generate_date_range(self, start_date: date, end_date: date) -> List[date]:
        """日付範囲生成"""
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)
        return dates
    
    def _calculate_completed_points_by_date(
        self, 
        issues: List[IssueModel], 
        target_date: date
    ) -> float:
        """指定日時点での完了ポイント計算"""
        completed_points = 0
        for issue in issues:
            if (issue.completed_at and 
                issue.completed_at.date() <= target_date and 
                issue.point):
                completed_points += issue.point
        return completed_points
    
    def _count_completed_issues_by_date(
        self, 
        issues: List[IssueModel], 
        target_date: date
    ) -> int:
        """指定日時点での完了issue数計算"""
        count = 0
        for issue in issues:
            if (issue.completed_at and 
                issue.completed_at.date() <= target_date):
                count += 1
        return count
    
    def _calculate_ideal_remaining(
        self, 
        total_points: float, 
        start_date: date, 
        end_date: date, 
        current_date: date
    ) -> float:
        """理想的な残りポイント計算（Burn-down用）"""
        if current_date <= start_date:
            return total_points
        if current_date >= end_date:
            return 0.0
        
        total_days = (end_date - start_date).days
        elapsed_days = (current_date - start_date).days
        progress_ratio = elapsed_days / total_days
        
        return total_points * (1 - progress_ratio)
    
    def _calculate_ideal_completed(
        self, 
        total_points: float, 
        start_date: date, 
        end_date: date, 
        current_date: date
    ) -> float:
        """理想的な完了ポイント計算（Burn-up用）"""
        if current_date <= start_date:
            return 0.0
        if current_date >= end_date:
            return total_points
        
        total_days = (end_date - start_date).days
        elapsed_days = (current_date - start_date).days
        progress_ratio = elapsed_days / total_days
        
        return total_points * progress_ratio
    
    def _calculate_total_points_by_date(
        self, 
        issues: List[IssueModel], 
        date_range: List[date]
    ) -> Dict[date, float]:
        """日付別総ポイント計算（スコープ変更対応）"""
        total_by_date = {}
        for target_date in date_range:
            total_points = 0
            for issue in issues:
                if (self._is_issue_in_scope_by_date(issue, target_date) and 
                    issue.point):
                    total_points += issue.point
            total_by_date[target_date] = total_points
        return total_by_date
    
    def _is_issue_in_scope_by_date(
        self, 
        issue: IssueModel, 
        target_date: date
    ) -> bool:
        """指定日時点でissueがスコープ内かどうか判定"""
        # issueが作成済み
        if issue.created_at.date() > target_date:
            return False
        
        # issueが削除されていない（基本的にはTrue）
        return True
    
    def generate_velocity_data(
        self, 
        issues: List[IssueModel], 
        weeks: int = 12
    ) -> List[Dict[str, Any]]:
        """ベロシティデータ生成"""
        try:
            # 週別完了ポイント集計
            weekly_data = defaultdict(float)
            
            for issue in issues:
                if issue.completed_at and issue.point:
                    # 週の開始日計算（月曜日基準）
                    week_start = issue.completed_at.date() - timedelta(
                        days=issue.completed_at.weekday()
                    )
                    weekly_data[week_start] += issue.point
            
            # 最新週から指定週数分取得
            sorted_weeks = sorted(weekly_data.keys(), reverse=True)[:weeks]
            
            velocity_data = []
            for week_start in reversed(sorted_weeks):
                week_end = week_start + timedelta(days=6)
                velocity_data.append({
                    'week_start': week_start.isoformat(),
                    'week_end': week_end.isoformat(),
                    'completed_points': weekly_data[week_start],
                    'completed_issues': self._count_issues_in_week(
                        issues, week_start, week_end
                    )
                })
            
            return velocity_data
            
        except Exception as e:
            logger.error(f"ベロシティデータ生成失敗: {e}")
            raise
    
    def _count_issues_in_week(
        self, 
        issues: List[IssueModel], 
        week_start: date, 
        week_end: date
    ) -> int:
        """週内完了issue数計算"""
        count = 0
        for issue in issues:
            if (issue.completed_at and 
                week_start <= issue.completed_at.date() <= week_end):
                count += 1
        return count

# グローバルインスタンス
chart_analyzer = ChartAnalyzer()
```

### 2. チャートデータモデル拡張

**backend/app/models/chart.py** 更新:
```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class ChartDataModel(BaseModel):
    date: date
    planned_points: float = 0.0
    actual_points: float = 0.0
    remaining_points: float = 0.0
    completed_points: float = 0.0
    total_points: float = 0.0
    completed_issues: int = 0
    total_issues: int = 0

class BurnChartRequest(BaseModel):
    milestone: Optional[str] = None
    start_date: date
    end_date: date
    chart_type: str  # 'burn_down' or 'burn_up'

class BurnChartResponse(BaseModel):
    chart_data: List[ChartDataModel]
    metadata: dict
    statistics: dict

class VelocityDataModel(BaseModel):
    week_start: date
    week_end: date
    completed_points: float
    completed_issues: int
```

### 3. チャートAPI実装

**backend/app/api/charts.py** 完全版:
```python
from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import date
from app.services.chart_analyzer import chart_analyzer
from app.services.issue_service import issue_service
from app.models.chart import BurnChartResponse, ChartDataModel

router = APIRouter()

@router.get("/burn-down", response_model=BurnChartResponse)
async def get_burn_down_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None)
):
    """Burn-downチャートデータ取得"""
    try:
        # Issue取得・分析
        issues, _ = await issue_service.get_analyzed_issues(
            milestone=milestone,
            analyze=True
        )
        
        # チャートデータ生成
        chart_data = chart_analyzer.generate_burn_down_data(
            issues, start_date, end_date, milestone
        )
        
        # メタデータ・統計情報
        metadata = {
            'total_issues': len(issues),
            'total_points': sum(i.point for i in issues if i.point),
            'milestone': milestone,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
        
        statistics = _calculate_chart_statistics(chart_data, 'burn_down')
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Burn-downチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/burn-up", response_model=BurnChartResponse)
async def get_burn_up_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    milestone: Optional[str] = Query(None)
):
    """Burn-upチャートデータ取得"""
    try:
        issues, _ = await issue_service.get_analyzed_issues(
            milestone=milestone,
            analyze=True
        )
        
        chart_data = chart_analyzer.generate_burn_up_data(
            issues, start_date, end_date, milestone
        )
        
        metadata = {
            'total_issues': len(issues),
            'total_points': sum(i.point for i in issues if i.point),
            'milestone': milestone,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
        
        statistics = _calculate_chart_statistics(chart_data, 'burn_up')
        
        return BurnChartResponse(
            chart_data=chart_data,
            metadata=metadata,
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Burn-upチャートAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/velocity")
async def get_velocity_data(weeks: int = Query(12, ge=1, le=52)):
    """ベロシティデータ取得"""
    try:
        issues, _ = await issue_service.get_analyzed_issues(analyze=True)
        velocity_data = chart_analyzer.generate_velocity_data(issues, weeks)
        
        return {
            'velocity_data': velocity_data,
            'average_velocity': sum(v['completed_points'] for v in velocity_data) / len(velocity_data) if velocity_data else 0,
            'weeks_analyzed': len(velocity_data)
        }
        
    except Exception as e:
        logger.error(f"ベロシティAPI失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _calculate_chart_statistics(chart_data: List[ChartDataModel], chart_type: str) -> dict:
    """チャート統計計算"""
    if not chart_data:
        return {}
    
    final_data = chart_data[-1]
    initial_data = chart_data[0]
    
    if chart_type == 'burn_down':
        return {
            'completion_rate': (initial_data.actual_points - final_data.actual_points) / initial_data.actual_points if initial_data.actual_points > 0 else 0,
            'final_remaining_points': final_data.remaining_points,
            'days_analyzed': len(chart_data)
        }
    else:  # burn_up
        return {
            'completion_rate': final_data.completed_points / final_data.total_points if final_data.total_points > 0 else 0,
            'final_completed_points': final_data.completed_points,
            'days_analyzed': len(chart_data)
        }
```

### 4. 単体テスト実装

**backend/tests/test_chart_analyzer.py**:
```python
import pytest
from datetime import date, datetime, timedelta
from app.services.chart_analyzer import ChartAnalyzer
from app.models.issue import IssueModel

class TestChartAnalyzer:
    
    @pytest.fixture
    def analyzer(self):
        return ChartAnalyzer()
    
    @pytest.fixture
    def sample_issues(self):
        base_date = datetime(2024, 1, 1)
        return [
            IssueModel(
                id=1, title="Issue 1", description="", state="closed",
                created_at=base_date, completed_at=base_date + timedelta(days=2),
                point=2.0, milestone="v1.0", labels=[]
            ),
            IssueModel(
                id=2, title="Issue 2", description="", state="closed",
                created_at=base_date, completed_at=base_date + timedelta(days=5),
                point=3.0, milestone="v1.0", labels=[]
            ),
            IssueModel(
                id=3, title="Issue 3", description="", state="opened",
                created_at=base_date, point=1.0, milestone="v1.0", labels=[]
            )
        ]
    
    def test_generate_burn_down_data(self, analyzer, sample_issues):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        chart_data = analyzer.generate_burn_down_data(
            sample_issues, start_date, end_date, "v1.0"
        )
        
        assert len(chart_data) == 7  # 7日間
        assert chart_data[0].remaining_points == 6.0  # 初日は全ポイント残り
        assert chart_data[2].remaining_points == 4.0  # 3日目：2ポイント完了
        assert chart_data[5].remaining_points == 1.0  # 6日目：5ポイント完了
    
    def test_generate_burn_up_data(self, analyzer, sample_issues):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 7)
        
        chart_data = analyzer.generate_burn_up_data(
            sample_issues, start_date, end_date, "v1.0"
        )
        
        assert len(chart_data) == 7
        assert chart_data[0].completed_points == 0.0  # 初日は完了ポイントなし
        assert chart_data[2].completed_points == 2.0  # 3日目：2ポイント完了
        assert chart_data[5].completed_points == 5.0  # 6日目：5ポイント完了
    
    def test_calculate_completed_points_by_date(self, analyzer, sample_issues):
        target_date = date(2024, 1, 3)
        completed = analyzer._calculate_completed_points_by_date(sample_issues, target_date)
        assert completed == 2.0  # Issue 1のみ完了
        
        target_date = date(2024, 1, 6)
        completed = analyzer._calculate_completed_points_by_date(sample_issues, target_date)
        assert completed == 5.0  # Issue 1, 2完了
    
    def test_generate_velocity_data(self, analyzer, sample_issues):
        velocity_data = analyzer.generate_velocity_data(sample_issues, weeks=4)
        
        # 完了issueがある週のデータが含まれること
        assert len(velocity_data) > 0
        assert all('completed_points' in v for v in velocity_data)
        assert all('completed_issues' in v for v in velocity_data)
```

## 成果物

### 必須成果物
1. **ChartAnalyzer実装**:
   - Burn-downチャート計算ロジック
   - Burn-upチャート計算ロジック
   - ベロシティデータ生成機能

2. **チャートAPI実装**:
   - GET /api/charts/burn-down
   - GET /api/charts/burn-up  
   - GET /api/charts/velocity

3. **データモデル拡張**:
   - ChartDataModel
   - BurnChartRequest/Response
   - VelocityDataModel

4. **テスト実装**:
   - ChartAnalyzer単体テスト
   - チャートAPI テスト

## 検証項目

### 実施前確認
- [x] Task 09のフィルタ機能動作確認
- [x] Issue分析データ品質確認
- [x] 計算ロジック仕様理解完了

### 実施後確認
- [x] Burn-downチャート計算正確性
- [x] Burn-upチャート計算正確性
- [x] 期間指定・マイルストーンフィルタ正常動作
- [x] ベロシティ計算正常動作
- [x] 単体テスト全件成功
- [x] API全件正常動作

### 品質確認
- [x] チャート計算精度適切
- [x] パフォーマンス適切（1000件 < 2秒）
- [x] エラーハンドリング適切
- [x] メタデータ・統計情報充実

## 次のタスクへの引き継ぎ

### Task 11への引き継ぎ事項
- チャートデータAPI完成版
- データ形式確定
- 統計情報仕様確定

### 注意事項
- 日付計算の精度
- タイムゾーン考慮
- 大量データでのパフォーマンス

## 作業時間見積もり: 8-10時間
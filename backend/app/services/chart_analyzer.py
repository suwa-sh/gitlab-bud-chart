from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict
import logging
from app.models.issue import IssueModel
from app.models.chart import ChartDataModel, BurnChartRequest, BurnChartResponse
from app.utils.business_days import BusinessDayCalculator

logger = logging.getLogger(__name__)

class ChartAnalyzer:
    """Burn-up/Burn-downチャート分析サービス"""
    
    def __init__(self):
        self.business_day_calc = BusinessDayCalculator()
    
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
            
            # 開始時点の総ポイント計算（期間外Openedや期間内完了のissueも含む）
            total_points = sum(
                issue.point for issue in filtered_issues 
                if issue.point and self._is_issue_in_scope_by_date(
                    issue, start_date, start_date, end_date
                )
            )
            
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
                    total_points=total_points,
                    completed_issues=self._count_completed_issues_by_date(
                        filtered_issues, current_date
                    ),
                    total_issues=len(filtered_issues)
                ))
            
            # データ整合性チェック
            self._validate_burn_down_data(chart_data, total_points)
            
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
                    remaining_points=total_points - completed_points,
                    total_issues=len([i for i in filtered_issues 
                                    if self._is_issue_in_scope_by_date(
                                        i, current_date, start_date, end_date
                                    )]),
                    completed_issues=self._count_completed_issues_by_date(
                        filtered_issues, current_date
                    )
                ))
            
            # データ整合性チェック
            self._validate_burn_up_data(chart_data)
            
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
        """理想的な残りポイント計算（Burn-down用）- 営業日ベース"""
        if current_date <= start_date:
            return total_points
        if current_date >= end_date:
            return 0.0
        
        # 営業日ベースで進捗率を計算
        progress_ratio = self.business_day_calc.calculate_business_day_progress(
            start_date, end_date, current_date
        )
        
        return total_points * (1 - progress_ratio)
    
    def _calculate_ideal_completed(
        self, 
        total_points: float, 
        start_date: date, 
        end_date: date, 
        current_date: date
    ) -> float:
        """理想的な完了ポイント計算（Burn-up用）- 営業日ベース"""
        if current_date <= start_date:
            return 0.0
        if current_date >= end_date:
            return total_points
        
        # 営業日ベースで進捗率を計算
        progress_ratio = self.business_day_calc.calculate_business_day_progress(
            start_date, end_date, current_date
        )
        
        return total_points * progress_ratio
    
    def _validate_burn_down_data(self, chart_data: List[ChartDataModel], total_points: float) -> None:
        """バーンダウンチャートデータの整合性チェック"""
        if not chart_data:
            return
        
        # 最終日の理想線が0になっているか確認
        final_planned = chart_data[-1].planned_points
        if abs(final_planned) > 0.01:  # 浮動小数点の誤差を考慮
            logger.warning(
                f"バーンダウンチャートの最終日理想線が0ではありません: {final_planned}"
            )
        
        # 各データポイントでの整合性チェック
        for data in chart_data:
            # 残りポイント = 総ポイント - 完了ポイント
            expected_remaining = data.total_points - data.completed_points
            if abs(data.remaining_points - expected_remaining) > 0.01:
                logger.warning(
                    f"データ整合性エラー ({data.date}): "
                    f"残りポイント={data.remaining_points}, "
                    f"期待値={expected_remaining}"
                )
    
    def _validate_burn_up_data(self, chart_data: List[ChartDataModel]) -> None:
        """バーンアップチャートデータの整合性チェック"""
        if not chart_data:
            return
        
        # 最終日の理想線が総ポイントに等しいか確認
        final_data = chart_data[-1]
        if abs(final_data.planned_points - final_data.total_points) > 0.01:
            logger.warning(
                f"バーンアップチャートの最終日理想線が総ポイントと一致しません: "
                f"理想線={final_data.planned_points}, 総ポイント={final_data.total_points}"
            )
        
        # 各データポイントでの整合性チェック
        for data in chart_data:
            # 残りポイント = 総ポイント - 完了ポイント
            expected_remaining = data.total_points - data.completed_points
            if abs(data.remaining_points - expected_remaining) > 0.01:
                logger.warning(
                    f"データ整合性エラー ({data.date}): "
                    f"残りポイント={data.remaining_points}, "
                    f"期待値={expected_remaining}"
                )
    
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
                if (self._is_issue_in_scope_by_date(
                    issue, target_date, date_range[0], date_range[-1]
                ) and issue.point):
                    total_points += issue.point
            total_by_date[target_date] = total_points
        return total_by_date
    
    def _is_issue_in_scope_by_date(
        self, 
        issue: IssueModel, 
        target_date: date,
        chart_start_date: date,
        chart_end_date: date
    ) -> bool:
        """指定日時点でissueがスコープ内かどうか判定"""
        # created_atが表示期間終了日より未来の場合は除外
        if issue.created_at.date() > chart_end_date:
            return False
        
        # Case 1: created_at <= target_date（従来の条件）
        if issue.created_at.date() <= target_date:
            return True
        
        # Case 2: created_atが範囲外でもOpenedなら対象（ただし期間内作成のみ）
        if issue.state == 'opened':
            return True
        
        # Case 3: completed_atが期間内なら対象（ただし期間内作成のみ）
        if (issue.completed_at and 
            chart_start_date <= issue.completed_at.date() <= chart_end_date):
            return True
        
        return False
    
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
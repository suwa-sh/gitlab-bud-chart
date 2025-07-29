import asyncio
from typing import List, Dict, Any, Optional
from functools import lru_cache
import logging
from datetime import datetime, timedelta, timezone
from app.models.issue import IssueModel

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """パフォーマンス最適化サービス"""
    
    def __init__(self):
        self._cache = {}
        self._cache_timeout = timedelta(minutes=5)  # 5分間キャッシュ
    
    @lru_cache(maxsize=128)
    def get_cached_analysis(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """分析結果キャッシュ"""
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.now(timezone.utc) - timestamp < self._cache_timeout:
                logger.info(f"Cache hit for key: {cache_key}")
                return cached_data
            else:
                # キャッシュ期限切れ
                del self._cache[cache_key]
        return None
    
    def set_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """キャッシュ設定"""
        self._cache[cache_key] = (data, datetime.now(timezone.utc))
        logger.info(f"Cache set for key: {cache_key}")
    
    async def optimize_issue_loading(self, issues: List[IssueModel]) -> List[IssueModel]:
        """Issue読み込み最適化"""
        try:
            # 並列処理による最適化
            optimized_issues = await self._process_issues_parallel(issues)
            
            # メモリ使用量最適化
            optimized_issues = self._optimize_memory_usage(optimized_issues)
            
            logger.info(f"Optimized {len(issues)} issues")
            return optimized_issues
            
        except Exception as e:
            logger.error(f"Issue loading optimization failed: {e}")
            return issues  # フォールバック
    
    async def _process_issues_parallel(self, issues: List[IssueModel]) -> List[IssueModel]:
        """Issue並列処理"""
        # バッチサイズを設定（メモリ効率化）
        batch_size = 50
        processed_issues = []
        
        for i in range(0, len(issues), batch_size):
            batch = issues[i:i + batch_size]
            
            # 各バッチを並列処理
            tasks = [self._process_single_issue(issue) for issue in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 成功した結果のみ追加
            for result in batch_results:
                if isinstance(result, IssueModel):
                    processed_issues.append(result)
                elif isinstance(result, Exception):
                    logger.warning(f"Issue processing failed: {result}")
        
        return processed_issues
    
    async def _process_single_issue(self, issue: IssueModel) -> IssueModel:
        """単一Issue処理"""
        # 非同期処理のシミュレーション（実際の処理はここに実装）
        await asyncio.sleep(0.001)  # 1ms待機
        return issue
    
    def _optimize_memory_usage(self, issues: List[IssueModel]) -> List[IssueModel]:
        """メモリ使用量最適化"""
        # 不要なフィールドの除去
        optimized_issues = []
        
        for issue in issues:
            # 必要なフィールドのみ保持
            optimized_issue = IssueModel(
                id=issue.id,
                title=issue.title,
                state=issue.state,
                labels=issue.labels,
                milestone=issue.milestone,
                assignee=issue.assignee,
                created_at=issue.created_at,
                updated_at=issue.updated_at,
                closed_at=issue.closed_at,
                # 大きなフィールド（description等）は必要な場合のみ保持
                description=issue.description[:500] if issue.description else None,  # 500文字制限
                story_points=issue.story_points,
                kanban_status=issue.kanban_status,
                service=issue.service,
                quarter=issue.quarter
            )
            optimized_issues.append(optimized_issue)
        
        return optimized_issues
    
    def optimize_chart_calculation(self, issues: List[IssueModel], chart_type: str = "burndown") -> Dict[str, Any]:
        """チャート計算最適化"""
        cache_key = f"{chart_type}_{len(issues)}_{hash(str(sorted([i.id for i in issues])))}"
        
        # キャッシュ確認
        cached_result = self.get_cached_analysis(cache_key)
        if cached_result:
            return cached_result
        
        try:
            # 効率的なアルゴリズム適用
            if chart_type == "burndown":
                result = self._calculate_burndown_optimized(issues)
            elif chart_type == "burnup":
                result = self._calculate_burnup_optimized(issues)
            else:
                result = self._calculate_velocity_optimized(issues)
            
            # キャッシュに保存
            self.set_cache(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Chart calculation optimization failed: {e}")
            return {"error": str(e)}
    
    def _calculate_burndown_optimized(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """最適化されたBurn-down計算"""
        # 効率的なデータ構造を使用
        points_by_date = {}
        total_points = sum(issue.story_points or 0 for issue in issues)
        
        # 日付順にソート（一度だけ）
        sorted_issues = sorted([i for i in issues if i.closed_at], key=lambda x: x.closed_at)
        
        # 累積計算
        completed_points = 0
        for issue in sorted_issues:
            date_key = issue.closed_at.date() if issue.closed_at else None
            if date_key:
                completed_points += issue.story_points or 0
                points_by_date[date_key] = {
                    'completed': completed_points,
                    'remaining': total_points - completed_points
                }
        
        return {
            'total_points': total_points,
            'points_by_date': points_by_date,
            'calculation_time': datetime.now(timezone.utc).isoformat()
        }
    
    def _calculate_burnup_optimized(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """最適化されたBurn-up計算"""
        # Burn-downと同様の最適化アプローチ
        total_points = sum(issue.story_points or 0 for issue in issues)
        completed_issues = [i for i in issues if i.closed_at]
        
        # 効率的な集計
        completion_by_date = {}
        completed_points = 0
        
        for issue in sorted(completed_issues, key=lambda x: x.closed_at):
            date_key = issue.closed_at.date()
            completed_points += issue.story_points or 0
            completion_by_date[date_key] = {
                'completed': completed_points,
                'total': total_points,
                'percentage': (completed_points / total_points * 100) if total_points > 0 else 0
            }
        
        return {
            'total_points': total_points,
            'completed_points': completed_points,
            'completion_by_date': completion_by_date,
            'calculation_time': datetime.now(timezone.utc).isoformat()
        }
    
    def _calculate_velocity_optimized(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """最適化されたベロシティ計算"""
        # 週次での集計
        velocity_by_week = {}
        
        # 完了したIssueのみ対象
        completed_issues = [i for i in issues if i.closed_at and i.story_points]
        
        for issue in completed_issues:
            # 週の開始日を計算
            week_start = issue.closed_at.date() - timedelta(days=issue.closed_at.weekday())
            
            if week_start not in velocity_by_week:
                velocity_by_week[week_start] = {
                    'points': 0,
                    'issues': 0
                }
            
            velocity_by_week[week_start]['points'] += issue.story_points
            velocity_by_week[week_start]['issues'] += 1
        
        # 平均ベロシティ計算
        total_weeks = len(velocity_by_week)
        total_points = sum(week['points'] for week in velocity_by_week.values())
        average_velocity = total_points / total_weeks if total_weeks > 0 else 0
        
        return {
            'velocity_by_week': velocity_by_week,
            'average_velocity': average_velocity,
            'total_weeks': total_weeks,
            'calculation_time': datetime.now(timezone.utc).isoformat()
        }
    
    def clear_cache(self) -> None:
        """キャッシュクリア"""
        self._cache.clear()
        self.get_cached_analysis.cache_clear()
        logger.info("Performance cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """キャッシュ統計情報"""
        return {
            'cache_size': len(self._cache),
            'lru_cache_info': self.get_cached_analysis.cache_info()._asdict(),
            'cache_timeout_minutes': self._cache_timeout.total_seconds() / 60
        }

# グローバルインスタンス
performance_optimizer = PerformanceOptimizer()
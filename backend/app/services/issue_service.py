from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import logging
from app.services.gitlab_client import GitLabClient
from app.models.issue import IssueModel, IssueResponse
from app.utils.retry import async_retry
from app.services.issue_analyzer import issue_analyzer
from app.utils.issue_filters import apply_exclusion_filter

logger = logging.getLogger(__name__)

class IssueService:
    def __init__(self, client: Optional[GitLabClient] = None):
        self.client = client
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_all_issues(
        self,
        state: Optional[str] = 'all',
        milestone: Optional[str] = None,
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        per_page: int = 100
    ) -> List[IssueModel]:
        """全issue取得（ページネーション対応）"""
        if not self.client or not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            all_issues = []
            page = 1
            
            while True:
                logger.info(f"Issues取得中... page: {page}")
                
                # パラメータ構築
                params = {
                    'state': state,
                    'per_page': per_page,
                    'page': page,
                    'order_by': 'created_at',
                    'sort': 'desc'
                }
                
                if milestone:
                    params['milestone'] = milestone
                if assignee:
                    params['assignee_username'] = assignee
                if labels:
                    params['labels'] = ','.join(labels)
                
                # API呼び出し
                issues_page = self.client.project.issues.list(**params)
                
                if not issues_page:
                    break
                
                # IssueModel変換
                for issue in issues_page:
                    issue_model = self._convert_to_model(issue)
                    all_issues.append(issue_model)
                
                # ページネーション制御
                if len(issues_page) < per_page:
                    break
                
                page += 1
                
                # 安全装置（最大1000件）
                if len(all_issues) >= 1000:
                    logger.warning("Issue取得数が1000件に達したため停止")
                    break
            
            logger.info(f"Issues取得完了: {len(all_issues)}件")
            return all_issues
            
        except Exception as e:
            logger.error(f"Issues取得失敗: {e}")
            raise
    
    @async_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    async def get_issue_by_id(self, issue_id: int) -> Optional[IssueModel]:
        """特定issue取得"""
        if not self.client or not self.client.gl or not self.client.project:
            raise ValueError("GitLab接続が設定されていません")
        
        try:
            issue = self.client.project.issues.get(issue_id)
            return self._convert_to_model(issue)
        except Exception as e:
            logger.error(f"Issue取得失敗 (ID: {issue_id}): {e}")
            return None
    
    async def get_issues_by_milestone(
        self,
        milestone: str,
        state: str = 'all'
    ) -> List[IssueModel]:
        """マイルストーン別issue取得"""
        return await self.get_all_issues(
            state=state,
            milestone=milestone
        )
    
    def _convert_to_model(self, gitlab_issue) -> IssueModel:
        """GitLab Issue → IssueModel 変換"""
        try:
            return IssueModel(
                id=gitlab_issue.id,
                iid=gitlab_issue.iid,
                title=gitlab_issue.title,
                description=gitlab_issue.description or "",
                state=gitlab_issue.state,
                created_at=self._parse_datetime(gitlab_issue.created_at),
                updated_at=self._parse_datetime(gitlab_issue.updated_at),
                due_date=self._parse_datetime(gitlab_issue.due_date) if gitlab_issue.due_date else None,
                assignee=gitlab_issue.assignee['name'] if gitlab_issue.assignee else None,
                milestone=gitlab_issue.milestone['title'] if gitlab_issue.milestone else None,
                labels=gitlab_issue.labels or [],
                web_url=gitlab_issue.web_url
            )
        except Exception as e:
            logger.error(f"Issue変換失敗: {e}")
            raise
    
    def _parse_datetime(self, date_str: Optional[str]) -> Optional[datetime]:
        """日時文字列解析（GitLabバージョン間の差異に対応）"""
        if not date_str:
            return None
        
        try:
            # GitLab 15.11系と17.9系での日時形式の差異に対応
            # パターン1: "2024-01-01T00:00:00.000Z" (timezone-aware)
            # パターン2: "2024-01-01T00:00:00.000" (timezone-naive)
            # パターン3: "2024-01-01T00:00:00Z" (マイクロ秒なし)
            
            if date_str.endswith('Z'):
                # UTC timezone指定の場合
                parsed_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            elif '+' in date_str or date_str.endswith('+00:00'):
                # 明示的なtimezone指定がある場合
                parsed_dt = datetime.fromisoformat(date_str)
            else:
                # timezone情報がない場合（GitLab 15.11系）
                parsed_dt = datetime.fromisoformat(date_str)
                # timezone-naiveな場合はUTCとして扱う
                if parsed_dt.tzinfo is None:
                    from datetime import timezone
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
            
            logger.debug(f"日時解析成功: {date_str} -> {parsed_dt} (tzinfo: {parsed_dt.tzinfo})")
            return parsed_dt
            
        except Exception as e:
            logger.warning(f"日時解析失敗: {date_str}, error: {e}")
            return None
    
    async def get_analyzed_issues(
        self,
        state: Optional[str] = 'all',
        milestone: Optional[str] = None,
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        analyze: bool = True,
        service: Optional[str] = None,
        kanban_status: Optional[str] = None
    ) -> Tuple[List[IssueModel], Dict[str, Any]]:
        """
        分析済みissue取得 + 統計情報
        """
        # Issue取得
        issues = await self.get_all_issues(
            state=state,
            milestone=milestone,
            assignee=assignee,
            labels=labels
        )
        
        # 分析実行
        if analyze:
            issues = issue_analyzer.analyze_issues_batch(issues)
        
        # 統一除外ルールを適用
        issues = apply_exclusion_filter(issues)
        
        # 追加のフィルタリング
        if service:
            issues = [i for i in issues if i.service == service]
        
        if kanban_status:
            issues = [i for i in issues if i.kanban_status == kanban_status]
        
        # 統計情報生成
        statistics = self._generate_statistics(issues)
        
        return issues, statistics
    
    def _generate_statistics(self, issues: List[IssueModel]) -> Dict[str, Any]:
        """
        Issue統計情報生成
        """
        try:
            total_count = len(issues)
            
            # 状態別集計
            state_counts = {}
            for issue in issues:
                state_counts[issue.state] = state_counts.get(issue.state, 0) + 1
            
            # Point集計
            total_points = sum(issue.point for issue in issues if issue.point)
            point_issues = [i for i in issues if i.point is not None and i.point > 0]
            avg_points = total_points / len(point_issues) if len(point_issues) > 0 else 0
            
            # Kanban Status集計
            kanban_counts = {}
            for issue in issues:
                if issue.kanban_status:
                    kanban_counts[issue.kanban_status] = kanban_counts.get(issue.kanban_status, 0) + 1
            
            # Service集計
            service_counts = {}
            for issue in issues:
                if issue.service:
                    service_counts[issue.service] = service_counts.get(issue.service, 0) + 1
            
            # 完了率
            completed_issues = [i for i in issues if i.completed_at or i.state == 'closed']
            completion_rate = len(completed_issues) / total_count if total_count > 0 else 0
            
            # 一意値リスト
            unique_values = issue_analyzer.get_unique_values(issues)
            
            return {
                'total_count': total_count,
                'state_counts': state_counts,
                'total_points': total_points,
                'average_points': round(avg_points, 2),
                'kanban_counts': kanban_counts,
                'service_counts': service_counts,
                'completion_rate': round(completion_rate, 4),
                'unique_values': unique_values
            }
            
        except Exception as e:
            logger.error(f"統計情報生成失敗: {e}")
            return {}

